
import React, { useState, useEffect, useCallback } from 'react';
import type { StoryResponse } from '../types';
import { YouTubeIcon } from './IconComponents';

interface YouTubeUploaderProps {
  videoUrl: string;
  storyData: StoryResponse | null;
  onClose: () => void;
}

const CLIENT_ID = '32270824122-qf2jse1n5e1m9qf1oqplj8vhf66qi3a3.apps.googleusercontent.com';
const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export const YouTubeUploader: React.FC<YouTubeUploaderProps> = ({ videoUrl, storyData, onClose }) => {
  const [title, setTitle] = useState(storyData?.metadata.title || 'My Cartoon Story');
  const [description, setDescription] = useState(storyData?.story.scenes.map(s => s.scene_description).join('\n\n') || 'A story generated with AI.');
  const [tags, setTags] = useState(storyData?.metadata.style_preset || 'AI, Cartoon, Animation');
  const [privacy, setPrivacy] =useState<'private' | 'unlisted' | 'public'>('private');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);

  // Load GAPI and GIS scripts and initialize them
  useEffect(() => {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => window.gapi.load('client', () => setGapiReady(true));
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => setGisReady(true);
    document.body.appendChild(gisScript);

    return () => {
      // Clean up scripts when component unmounts
      const existingGapi = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
      if (existingGapi) document.body.removeChild(existingGapi);
      const existingGis = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingGis) document.body.removeChild(existingGis);
    };
  }, []);

  useEffect(() => {
    if (gapiReady && gisReady && !tokenClient) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: YOUTUBE_UPLOAD_SCOPE,
        callback: '', // defined later
      });
      setTokenClient(client);

      window.gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
      }).catch((err: any) => {
        setError(`Failed to initialize Google API client: ${err.message}`);
      });
    }
  }, [gapiReady, gisReady, tokenClient]);

  const handleAuthClick = useCallback(() => {
    if (!tokenClient) return;

    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
      localStorage.setItem('youtube_token', JSON.stringify(resp));
      await uploadVideo(resp.access_token);
    };
    
    const storedTokenString = localStorage.getItem('youtube_token');
    if (storedTokenString) {
       const storedToken = JSON.parse(storedTokenString);
       // Check if token is expired
       if (storedToken.expires_in > 0) {
           window.gapi.client.setToken(storedToken);
           uploadVideo(storedToken.access_token);
           return;
       }
    }
    
    // If no valid token, request a new one
    tokenClient.requestAccessToken({ prompt: 'consent' });
    
  }, [tokenClient, title, description, tags, privacy, videoUrl]);

  const uploadVideo = async (accessToken: string) => {
    setIsUploading(true);
    setError(null);
    setUploadStatus('Preparing video for upload...');

    try {
        const videoBlob = await fetch(videoUrl).then(r => r.blob());
        const metadata = {
            snippet: {
                title,
                description,
                tags: tags.split(',').map(tag => tag.trim()),
            },
            status: {
                privacyStatus: privacy,
            },
        };
        
        const uploader = new (window as any).MediaUploader({
            baseUrl: 'https://www.googleapis.com/upload/youtube/v3/videos',
            file: videoBlob,
            token: accessToken,
            metadata: metadata,
            params: {
                part: Object.keys(metadata).join(','),
            },
            onError: (data: string) => {
                const message = JSON.parse(data).error.message;
                setError(`Upload failed: ${message}`);
                setIsUploading(false);
            },
            onProgress: (data: any) => {
                const progress = Math.floor((data.loaded / data.total) * 100);
                setUploadProgress(progress);
                setUploadStatus(`Uploading... ${progress}%`);
            },
            onComplete: (data: string) => {
                const uploadResponse = JSON.parse(data);
                setUploadStatus('Upload complete! Video is now processing on YouTube.');
                setSuccessUrl(`https://www.youtube.com/watch?v=${uploadResponse.id}`);
                setIsUploading(false);
            },
        });
        
        uploader.upload();

    } catch (err: any) {
        setError(`An error occurred: ${err.message}`);
        setIsUploading(false);
    }
  };
  
  // This is a simplified version of Google's resumable uploader helper class.
  useEffect(() => {
    if (typeof (window as any).MediaUploader === 'undefined') {
        (window as any).MediaUploader = function(options: any) {
            const noop = function() {};
            this.file = options.file;
            this.contentType = this.file.type || 'application/octet-stream';
            this.metadata = options.metadata || {};
            this.token = options.token;
            this.onComplete = options.onComplete || noop;
            this.onProgress = options.onProgress || noop;
            this.onError = options.onError || noop;
            this.offset = 0;
            this.chunkSize = 0; // Let the uploader determine chunk size
            this.retryHandler = new (window as any).RetryHandler();
            const params = options.params || {};
            params.uploadType = 'resumable';
            this.url = this.buildUrl_('', params, options.baseUrl);
            this.httpMethod = 'POST';
        };

        (window as any).MediaUploader.prototype.upload = function() {
            const xhr = new XMLHttpRequest();
            xhr.open(this.httpMethod, this.url, true);
            xhr.setRequestHeader('Authorization', 'Bearer ' + this.token);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            xhr.setRequestHeader('X-Upload-Content-Length', this.file.size);
            xhr.setRequestHeader('X-Upload-Content-Type', this.contentType);
            xhr.onload = (e: any) => {
                if (e.target.status < 400) {
                    this.url = e.target.getResponseHeader('Location');
                    this.sendFile_();
                } else {
                    this.onError(e.target.response);
                }
            };
            xhr.onerror = () => this.onError(xhr.response);
            xhr.send(JSON.stringify(this.metadata));
        };

        (window as any).MediaUploader.prototype.sendFile_ = function() {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', this.url, true);
            xhr.setRequestHeader('Content-Type', this.contentType);
            if (xhr.upload) {
              xhr.upload.onprogress = this.onProgress;
            }
            xhr.onload = (e: any) => {
                if (e.target.status >= 200 && e.target.status < 300) {
                    this.onComplete(e.target.response);
                } else {
                    this.onError(e.target.response);
                }
            };
            xhr.onerror = () => this.onError(xhr.response);
            xhr.send(this.file);
        };

        (window as any).MediaUploader.prototype.buildUrl_ = function(id: string, params: any, baseUrl: string) {
            let url = baseUrl;
            const B = (s: string, v: string) => (s + (s.indexOf('?') >= 0 ? '&' : '?') + v);
            for (let p in params) {
                url = B(url, p + '=' + encodeURIComponent(params[p]));
            }
            return url;
        };
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthClick();
  };

  const renderContent = () => {
    if (successUrl) {
      return (
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-400 mb-4">Upload Successful!</h3>
          <p className="text-gray-300 mb-4">Your video has been uploaded to YouTube and is being processed.</p>
          <a
            href={successUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline break-all"
          >
            {successUrl}
          </a>
          <button
            onClick={onClose}
            className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            Done
          </button>
        </div>
      );
    }
    
    if (isUploading) {
      return (
        <div className="text-center">
          <h3 className="text-xl font-bold text-cyan-400 mb-4">{uploadStatus}</h3>
          <div className="w-full bg-gray-700 rounded-full h-4 my-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4 text-center">Push Video to YouTube</h2>
        
        {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Title (required)</label>
          <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 transition"/>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={5} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 transition"/>
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
          <input type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 transition"/>
        </div>
        <div>
          <label htmlFor="privacy" className="block text-sm font-medium text-gray-300 mb-1">Privacy</label>
          <select id="privacy" value={privacy} onChange={e => setPrivacy(e.target.value as any)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 transition">
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div className="flex gap-4 pt-4">
            <button
                type="button"
                onClick={onClose}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={!gapiReady || !gisReady || isUploading}
                className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
            >
                <YouTubeIcon className="w-6 h-6" />
                Push Video to YouTube
            </button>
        </div>
      </form>
    );
  };
  
  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-700 w-full max-w-2xl mx-auto">
      {renderContent()}
    </div>
  );
};

# Deployment Guide

How to deploy your spatial journalism experience to production.

## Requirements

- **HTTPS**: Required for camera and motion sensor access
- **CORS**: Configure if loading assets from different domains
- **MIME Types**: Ensure server correctly serves `.glb`, `.mp4`, `.woff2` files

## Build for Production

```bash
npm run build:prod
```

This creates optimized files in the `dist/` directory.

## Deployment Options

### Option 1: Static Hosting

Upload the `dist/` folder to any static hosting service:

- **Netlify**: Drag and drop or connect to Git
- **Vercel**: Deploy from Git repository
- **GitHub Pages**: Use `gh-pages` branch
- **AWS S3 + CloudFront**: For scalable CDN delivery
- **Firebase Hosting**: Google's hosting solution

### Option 2: Your Own Server

1. Copy `dist/` contents to your web server
2. Configure HTTPS (required)
3. Set up proper MIME types

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/your-story;
    index index.html;
    
    # MIME types
    types {
        model/gltf-binary glb;
        font/woff2 woff2;
    }
    
    # Compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    
    # Cache static assets
    location ~* \.(glb|mp4|mp3|woff2|jpg|png)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option 3: CDN for Assets

For large media files, use a CDN:

1. Upload assets to CDN (e.g., Cloudflare R2, AWS CloudFront)
2. Update `basePath` in `story.json`:

```json
{
  "project": {
    "assets": {
      "basePath": "https://cdn.yourdomain.com/story-assets/"
    }
  }
}
```

## 8th Wall Deployment

If using 8th Wall's hosting:

1. Build your project
2. Upload to 8th Wall's workspace
3. Publish through 8th Wall console

## Performance Optimization

### Asset Optimization

1. **3D Models**: 
   - Use Draco compression for GLB files
   - Reduce polygon count
   - Optimize textures (power of 2, compressed)

2. **Videos**:
   - Use H.264 codec for compatibility
   - Compress to appropriate bitrate (2-5 Mbps)
   - Consider adaptive streaming for long videos

3. **Audio**:
   - Use MP3 at 128-192 kbps
   - Trim silence from files

4. **Images**:
   - Use WebP format where supported
   - Optimize JPEG quality (70-85%)
   - Appropriate dimensions for target devices

### Loading Strategy

Preload essential assets:

```json
{
  "project": {
    "assets": {
      "preload": [
        "models/environment.glb",
        "models/main_character.glb",
        "audio/scene1.mp3"
      ]
    }
  }
}
```

## Testing Checklist

Before deployment:

- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome
- [ ] Test on desktop browsers
- [ ] Verify AR mode works (requires HTTPS)
- [ ] Check asset loading times
- [ ] Test language switching
- [ ] Verify all videos play
- [ ] Test scene transitions
- [ ] Check mobile performance (aim for 30+ FPS)

## Monitoring

Consider adding analytics:

```javascript
engine.onSceneChange = (from, to) => {
  analytics.track('scene_change', { from, to })
}

engine.onComplete = () => {
  analytics.track('story_completed')
}
```

## Troubleshooting

### Assets Not Loading

- Check browser console for CORS errors
- Verify file paths are correct
- Ensure MIME types are configured

### AR Not Working

- Confirm HTTPS is enabled
- Check camera permissions
- Verify 8th Wall scripts are loaded

### Performance Issues

- Reduce model complexity
- Compress video files
- Use lower resolution textures
- Preload critical assets

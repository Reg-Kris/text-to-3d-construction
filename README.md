# Text-to-3D Construction Platform

**🚨 PROPRIETARY SOFTWARE - NOT OPEN SOURCE 🚨**

Copyright © 2024 Kristopher Gerasimov. All rights reserved.

## Overview

A proprietary web application for generating 3D construction models from text descriptions using AI-powered 3D generation APIs. Designed specifically for prefab construction businesses to visualize projects and create 3D assets compatible with Unreal Engine and Blender.

## ⚠️ Legal Notice

This software is **PROPRIETARY** and **CONFIDENTIAL**. This repository may be publicly accessible for demonstration purposes only. 

**This is NOT open source software.**

- ❌ You may NOT copy, modify, or distribute this software
- ❌ You may NOT use this software commercially without permission
- ❌ You may NOT create derivative works
- ✅ You may view this code for educational/evaluation purposes only

See [LICENSE](LICENSE) for full terms and conditions.

## Features

### Core Functionality
- 🎯 **AI-powered 3D Generation**: Text-to-3D model creation using Meshy AI API
- 🔗 **Project Management**: Complete Airtable integration for project tracking and history
- 🎮 **Professional Export**: GLB, FBX, OBJ, USDZ formats compatible with Unreal Engine 5 and Blender
- 🔒 **Access Control**: Email-based authentication and whitelist system

### Device Optimization
- 📱 **Mobile Support**: Optimized for mobile devices (8K polygon limit)
- 💻 **Desktop Performance**: Enhanced quality for desktop users (30K polygon limit)
- 🚀 **Adaptive Loading**: Device-specific performance controls and file size limits
- ⚠️ **Performance Warnings**: Real-time device capability detection and warnings

### User Experience
- ⚡ **Real-time Preview**: WebGL-based 3D model visualization
- 📊 **Progress Tracking**: Live generation progress with detailed status updates
- 🎛️ **Quality Controls**: Configurable quality settings (Low/Medium/High)
- 📈 **Analytics**: Download tracking and usage statistics via Airtable

## Technology Stack

- **Frontend**: TypeScript, Vite, HTML5, CSS3
- **3D Generation**: Meshy AI v1 REST API
- **Database**: Airtable API with official SDK
- **3D Viewer**: Google Model Viewer with WebGL2 support
- **Device Detection**: Custom utility for mobile/tablet/desktop optimization
- **Build System**: Vite bundler with TypeScript compilation
- **Deployment**: GitHub Pages (static hosting)

## Installation (Authorized Users Only)

This software requires API keys and authorized access. Contact gerasimovkris@gmail.com for licensing inquiries.

### Prerequisites
- Node.js 18+ and npm
- Meshy AI API key
- Airtable Personal Access Token and Base ID
- Email address added to whitelist

### Environment Variables
```bash
VITE_MESHY_API_KEY=your_meshy_api_key
VITE_AIRTABLE_PAT=your_airtable_personal_access_token  
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_AUTHORIZED_EMAILS=email1@domain.com,email2@domain.com
```

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Usage

This application is designed for authorized construction professionals to:

1. **Generate 3D Models**: Enter detailed construction descriptions to create 3D models
2. **Project Management**: Track generation history and project status via Airtable
3. **Export Assets**: Download models in multiple formats for use in Unreal Engine 5, Blender
4. **Performance Optimization**: Automatic device detection for optimal model quality

## Support

For authorized users experiencing technical issues:
- Email: gerasimovkris@gmail.com
- Include your authorized email address in support requests

## Copyright

© 2024 Kristopher Gerasimov. All rights reserved. Unauthorized use is prohibited.

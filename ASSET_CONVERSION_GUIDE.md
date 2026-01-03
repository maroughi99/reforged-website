# Asset Conversion Guide

## Problem
Warcraft 3 Reforged uses proprietary file formats:
- `.blp` - Blizzard Picture format (textures/images)
- `.dds` - DirectDraw Surface (textures)
- `.mdx` - Warcraft 3 models

Web browsers cannot load these formats natively. They need to be converted to web-compatible formats like PNG, WebP, or JPG.

## Solution Options

### Option 1: Automated Conversion (Recommended)

1. **Install ImageMagick** (can sometimes handle BLP files):
   ```bash
   winget install ImageMagick.ImageMagick
   ```
   Or download from: https://imagemagick.org/script/download.php

2. **Run the conversion script**:
   ```bash
   node convert-assets.js
   ```

### Option 2: Manual Conversion with BLP Converter

1. **Download BLP Converter**:
   - BLPConverter: https://www.hiveworkshop.com/threads/blp-converter.23991/
   - Or Warcraft 3 Viewer: https://www.hiveworkshop.com/threads/warcraft-3-viewer.62701/

2. **Convert key assets**:
   - Console backgrounds: `ui/console/*/console-*-background.blp`
   - Main menu: `ui/glues/mainmenu/mainmenu-*.blp`
   - Buttons: `ui/glues/mainmenu/*button*.blp`

3. **Save as PNG** to `client/public/assets/` maintaining the folder structure

### Option 3: Alternative Free Assets

If conversion proves difficult, use free fantasy/medieval UI assets:
- OpenGameArt.org
- Itch.io (free game assets)
- Create stylized CSS backgrounds with gradients and textures

## Key Assets Needed

### High Priority:
1. `console/reforged/console-reforged-background.blp` - Main UI background
2. `console/human/console-human-background.blp` - Human theme
3. `console/orc/console-orc-background.blp` - Orc theme
4. `console/undead/console-undead-background.blp` - Undead theme
5. `console/nightelf/console-nightelf-background.blp` - Night Elf theme
6. `glues/mainmenu/mainmenu-wood.blp` - Wooden texture
7. `glues/mainmenu/mainmenu-buttonpanel.blp` - Button textures

### Medium Priority:
- Loading screens
- Score screen frames
- Button highlights/states
- Icons and emblems

## After Conversion

Once assets are converted to PNG:
1. Place them in `client/public/assets/` maintaining folder structure
2. Update CSS files to reference the PNG files instead of .blp
3. Optimize PNGs with tools like TinyPNG or ImageOptim for web performance

## CSS Updates Needed

Replace `.blp` references with `.png` in these files:
- `client/src/styles/HomePage.css`
- `client/src/styles/Navbar.css`
- `client/src/styles/LadderPage.css`
- `client/src/styles/CommunityPage.css`
- `client/src/App.css`

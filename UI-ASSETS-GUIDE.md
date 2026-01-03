# Using Warcraft 3 UI Assets

This guide explains how to integrate the Warcraft 3 UI assets from the workspace into your website.

## Available Assets

The `ui/` folder contains authentic Warcraft 3 Reforged assets:

- **Buttons** (`ui/buttons/`) - UI buttons and icons
- **Cursors** (`ui/cursor/`) - Custom mouse cursors
- **Console UI** (`ui/console/`) - Race-specific UI elements (Human, Orc, Undead, Night Elf)
- **Feedback** (`ui/feedback/`) - Visual feedback elements
- **Frame Definitions** (`ui/framedef/`) - UI layout definitions
- **Minimap** (`ui/minimap/`) - Minimap assets
- **Data Files** - Unit data, skin metadata, campaign info

## How to Use Assets

### 1. Copy Assets to Public Folder

```powershell
# Create assets directory in client
New-Item -Path "client\public\assets" -ItemType Directory -Force

# Copy specific assets you want to use
# Example: Copy cursors
Copy-Item -Path "..\ui\cursor\*" -Destination "client\public\assets\cursors\" -Recurse

# Example: Copy race-specific console UI
Copy-Item -Path "..\ui\console\human\*" -Destination "client\public\assets\console\human\" -Recurse
Copy-Item -Path "..\ui\console\orc\*" -Destination "client\public\assets\console\orc\" -Recurse
Copy-Item -Path "..\ui\console\undead\*" -Destination "client\public\assets\console\undead\" -Recurse
Copy-Item -Path "..\ui\console\nightelf\*" -Destination "client\public\assets\console\nightelf\" -Recurse

# Example: Copy button assets
Copy-Item -Path "..\ui\feedback\commandbutton\*" -Destination "client\public\assets\buttons\" -Recurse
```

### 2. Use Custom Cursors

Add to `client/src/App.css`:

```css
/* Custom Warcraft 3 Cursor */
body {
  cursor: url('/assets/cursors/humancursor.mdx'), auto;
}

/* Different cursors for different races/sections */
.human-section {
  cursor: url('/assets/cursors/humancursor.mdx'), pointer;
}

.orc-section {
  cursor: url('/assets/cursors/orccursor.mdx'), pointer;
}

.undead-section {
  cursor: url('/assets/cursors/undeadcursor.mdx'), pointer;
}

.nightelf-section {
  cursor: url('/assets/cursors/nightelfcursor.mdx'), pointer;
}
```

### 3. Background Images

Use race-specific console backgrounds:

```css
/* In your component CSS */
.ladder-page.human {
  background-image: url('/assets/console/human/background.dds');
  background-size: cover;
}

.community-page.orc {
  background-image: url('/assets/console/orc/background.dds');
}
```

### 4. Button Styling with Game Assets

```css
/* Use Warcraft 3 button textures */
.btn-warcraft {
  background-image: url('/assets/buttons/button-normal.dds');
  background-size: cover;
  border: none;
  padding: 12px 24px;
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

.btn-warcraft:hover {
  background-image: url('/assets/buttons/button-hover.dds');
}

.btn-warcraft:active {
  background-image: url('/assets/buttons/button-pressed.dds');
}
```

### 5. Extract Data from Game Files

The UI folder contains useful data files:

#### Unit Editor Data (`ui/uniteditordata.txt`)
Contains unit information, stats, and abilities

#### Skin Metadata (`ui/skinmetadata.slk`)
Contains UI skin definitions and mappings

#### Misc Data (`ui/miscdata.txt`, `ui/miscui.txt`)
Contains various game constants and UI strings

Example: Parse and use unit data:

```javascript
// Create a script to parse uniteditordata.txt
// Extract hero names, abilities, etc.
// Use in your ladder rankings or community posts
```

## Practical Implementation Examples

### Example 1: Race-Specific Themes

Create a component that changes theme based on selected race:

```javascript
// In your component
const [selectedRace, setSelectedRace] = useState('Human');

const raceThemes = {
  Human: {
    primary: '#4a90e2',
    background: '/assets/console/human/bg.dds',
    cursor: '/assets/cursors/humancursor.mdx'
  },
  Orc: {
    primary: '#d32f2f',
    background: '/assets/console/orc/bg.dds',
    cursor: '/assets/cursors/orccursor.mdx'
  },
  // ... other races
};

return (
  <div 
    className={`page ${selectedRace.toLowerCase()}-theme`}
    style={{
      '--race-color': raceThemes[selectedRace].primary,
      backgroundImage: `url(${raceThemes[selectedRace].background})`
    }}
  >
    {/* Your content */}
  </div>
);
```

### Example 2: Custom Loading Spinner

Use Warcraft 3 assets for loading states:

```css
.loading-spinner {
  width: 64px;
  height: 64px;
  background-image: url('/assets/feedback/cooldown/spinner.dds');
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Example 3: Hero Level Indicators

Use hero level icons from the game:

```jsx
// In ladder ranking component
<div className="player-level">
  <img 
    src={`/assets/buttons/herolevel/level-${playerLevel}.dds`}
    alt={`Level ${playerLevel}`}
  />
</div>
```

## Asset Conversion Notes

### Converting .dds to Web Formats

DDS files are DirectDraw Surface textures. For web use, convert them:

```powershell
# Using ImageMagick (install first: choco install imagemagick)
magick convert input.dds output.png

# Or use online converters:
# - https://convertio.co/dds-png/
# - https://www.aconvert.com/image/dds-to-png/
```

### Converting .mdx to Web Format

MDX files are Warcraft 3 model files. For simple icon/cursor use:
1. Extract textures from MDX
2. Convert to PNG/SVG
3. Use in CSS

## Best Practices

1. **Optimize Assets**: Compress images before using
2. **Lazy Loading**: Load assets only when needed
3. **Fallbacks**: Always provide fallback images/cursors
4. **License**: Respect Blizzard's intellectual property

## Example: Full Integration

Create a complete race-themed page:

```jsx
import React from 'react';
import './RaceThemedPage.css';

const RaceThemedPage = ({ race = 'Human' }) => {
  return (
    <div className={`race-page race-${race.toLowerCase()}`}>
      <div className="race-header">
        <img 
          src={`/assets/console/${race.toLowerCase()}/icon.dds`}
          alt={race}
          className="race-icon"
        />
        <h1>{race} Ladder</h1>
      </div>
      
      <div className="race-content">
        {/* Your content with race-specific styling */}
      </div>
      
      <div className="race-decorations">
        <img 
          src={`/assets/console/${race.toLowerCase()}/border.dds`}
          className="decoration-border"
        />
      </div>
    </div>
  );
};
```

## Resources

- **Warcraft 3 Art Tools**: Download from Blizzard for editing MDX files
- **DDS Plugins**: Photoshop/GIMP plugins for editing DDS files
- **WC3 Modding Community**: Hiveworkshop.com for tools and tutorials

## Next Steps

1. Explore the UI folder to find assets you want to use
2. Convert assets to web-friendly formats
3. Copy to `client/public/assets/`
4. Update CSS/components to use the assets
5. Test and optimize performance

---

**Note**: These are game assets from Warcraft 3 Reforged. Use them responsibly and respect Blizzard Entertainment's intellectual property rights.

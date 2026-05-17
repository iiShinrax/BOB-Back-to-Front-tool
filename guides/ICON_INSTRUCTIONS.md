
# Icon Creation Instructions

To create the icon.png file needed for VS Code extension publishing:

1. Create a 128x128 pixel PNG image
2. Use a blue background (#4A90E2) 
3. Add white "BOB" text in the center
4. Save as icon.png in the root directory

You can:
- Use any image editor (GIMP, Photoshop, etc.)
- Use online SVG to PNG converters with the icon.svg file
- Use the command: npx sharp-cli --input icon.svg --output icon.png --resize 128x128

For now, we'll proceed without the icon (VS Code will use a default).

import * as THREE from 'three';

const DEFAULT_TEXTURE_WIDTH = 512;
const DEFAULT_TEXTURE_HEIGHT = 512;

/**
 * Generates a procedural texture representing a floral field.
 * @returns {THREE.CanvasTexture} The generated texture. 
 * @param {number} width - The width of the texture in pixels. Default is 512.
 * @param {number} height - The height of the texture in pixels. Default is 512.
 * @param {number} flowers - The number of flowers to generate. Default is 300.
 * @param {string[]} colors - An array of color strings to use for the flowers. Default includes white, bright yellow, violet, and vibrant light blue.
 * @param {number} minRadius - The radius of the flowers. Default is 1.
 * @param {number} variation - The maximum variation in flower size. Default is 2.
*/
export function createFloralFieldTexture(
        width = DEFAULT_TEXTURE_WIDTH, 
        height = DEFAULT_TEXTURE_HEIGHT, 
        flowers = 300,
        minRadius = 1,
        variation = 2
    ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const colors = ['#FFFFFF', '#FFEE00', '#BE93FD', '#73C2FB']; // White, Bright Yellow, Violet, Vibrant Light Blue

    // Background
    context.fillStyle = '#519957'; // Adjusted light green for better contrast
    context.fillRect(0, 0, width, height);

    // Calculate scale factor and maximum flower radius to create safe margins
    const scaleFactor = Math.sqrt((width * height) / (DEFAULT_TEXTURE_WIDTH * DEFAULT_TEXTURE_HEIGHT));
    const maxFlowerRadius = (variation + minRadius) * scaleFactor;
    
    // Create safe margins to prevent flowers from being cut off at edges
    const margin = Math.ceil(maxFlowerRadius);
    const safeWidth = width - 2 * margin;
    const safeHeight = height - 2 * margin;

    for (let i = 0; i < flowers; i++) {
        const x = Math.random() * safeWidth + margin;
        const y = Math.random() * safeHeight + margin;
        const radius = (Math.random() * variation + minRadius) * scaleFactor;
        const color = colors[Math.floor(Math.random() * colors.length)];

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

/**
 * Generates a procedural texture representing a starry sky with twilight effect.
 * @returns {THREE.CanvasTexture} The generated texture.
 * @param {number} width - The width of the texture in pixels. Default is 512.
 * @param {number} height - The height of the texture in pixels. Default is 512.
 * @param {number} stars - The number of stars to generate.
 * @param {number} minStarSize - The minimum size of the stars. Default is 0.5.
 * @param {number} starVariation - The maximum variation in star size. Default is 0.2.
 * @param {number} minHeight - The minimum height (0-1) where stars can appear. 0 = horizon, 1 = zenith. Default is 0.
 * @param {number} maxHeight - The maximum height (0-1) where stars can appear. 0 = horizon, 1 = zenith. Default is 1.
 * @param {number} twilightOverlap - How much the violet gradient extends from horizon (0-1). 0 = no gradient, 1 = to zenith. Default is 0.3.
*/
export function createStarrySkyTexture(
        width = DEFAULT_TEXTURE_WIDTH, 
        height = DEFAULT_TEXTURE_HEIGHT, 
        stars = 800,
        minStarSize = 0.5,
        starVariation = 0.2,
        twilightOverlap = 0,
    ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Background gradient. starts at bottom pole (0) and goes to zenith (1)
    const gradient = context.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(1, '#000068'); // Deep blue
    gradient.addColorStop(0, '#320154'); // Dark violet
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const scaleFactor = Math.sqrt((width * height) / (DEFAULT_TEXTURE_WIDTH * DEFAULT_TEXTURE_HEIGHT));
    const maxStarRadius = (starVariation + minStarSize) * scaleFactor;
    
    // Create safe margins to prevent stars from being cut off at edges
    const margin = Math.ceil(maxStarRadius);
    const safeWidth = width - 2 * margin;
    const safeHeight = height - 2 * margin;

    // Draw stars first
    for (let i = 0; i < stars; i++) {
        const x = Math.random() * safeWidth + margin;
        const y = Math.random() * safeHeight + margin;
        const radius = (Math.random() * starVariation + minStarSize) * scaleFactor;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = 'white';
        context.fill();
    }

    // Create twilight overlay gradient that fades stars near the horizon
    // Middle of texture (height/2) = horizon, bottom = underground, top = zenith
    if (twilightOverlap > 0) {
        const twilightHeight = Math.min(twilightOverlap, 0.2);
        const intensity = Math.pow(twilightOverlap, 0.2); // Non-linear intensity control
        
        const twilightGradient = context.createLinearGradient(0, height, 0, 0);
        twilightGradient.addColorStop(0.5, `rgba(49, 1, 84, ${intensity})`); // Horizon with variable intensity
        twilightGradient.addColorStop(0.5 + twilightHeight, 'rgba(49, 1, 84, 0)'); // Fade to transparent
        
        context.globalCompositeOperation = 'normal';
        context.fillStyle = twilightGradient;
        context.fillRect(0, 0, width, height);
        context.globalCompositeOperation = 'source-over'; // Reset blend mode
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

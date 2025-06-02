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
 * Generates a procedural texture representing a starry sky.
 * @returns {THREE.CanvasTexture} The generated texture.
 * @param {number} width - The width of the texture in pixels. Default is 512.
 * @param {number} height - The height of the texture in pixels. Default is 512.
 * @param {number} stars - The number of stars to generate.
 * @param {number} minRadius - The minimum size of the stars. Default is 0.5.
 * @param {number} variation - The maximum variation in star size. Default is 0.2.
*/
export function createStarrySkyTexture(
        width = DEFAULT_TEXTURE_WIDTH, 
        height = DEFAULT_TEXTURE_HEIGHT, 
        stars = 800,
        minStarSize = 0.5,
        starVariation = 0.2
    ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Background gradient
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#000068'); // Deep blue
    gradient.addColorStop(1, '#320154'); // Dark violet
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const scaleFactor = Math.sqrt((width * height) / (DEFAULT_TEXTURE_WIDTH * DEFAULT_TEXTURE_HEIGHT));
    const maxStarRadius = (starVariation + minStarSize) * scaleFactor;
    
    // Create safe margins to prevent flowers from being cut off at edges
    const margin = Math.ceil(maxStarRadius);
    const safeWidth = width - 2 * margin;
    const safeHeight = height - 2 * margin;

    for (let i = 0; i < stars; i++) {
        const x = Math.random() * safeWidth;
        const y = Math.random() * safeHeight;
        // Adjusted star radius for higher res texture, aiming for small, sharp points
        // Stars of 1 to 2 pixels radius (at 512x512 texture size, scales with size)
        const radius = (Math.random() * starVariation + minStarSize ) * scaleFactor;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = 'white';
        context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

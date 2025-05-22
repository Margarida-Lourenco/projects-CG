import * as THREE from 'three';

const DEFAULT_TEXTURE_WIDTH = 512;
const DEFAULT_TEXTURE_HEIGHT = 512;

/**
 * Generates a procedural texture representing a floral field.
 * @returns {THREE.CanvasTexture} The generated texture. 
 * @param {number} width - The width of the texture in pixels. Default is 512.
 * @param {number} height - The height of the texture in pixels. Default is 512.
 */
export function createFloralFieldTexture(width = DEFAULT_TEXTURE_WIDTH, height = DEFAULT_TEXTURE_HEIGHT) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Background
    context.fillStyle = '#B0F2B6'; // Adjusted light green for better contrast
    context.fillRect(0, 0, DEFAULT_TEXTURE_WIDTH, DEFAULT_TEXTURE_HEIGHT);

    const colors = ['#FFFFFF', '#FFEE00', '#BE93FD', '#73C2FB']; // White, Bright Yellow, Violet, Vibrant Light Blue
    const numCircles = 300; // This density might need adjustment if texture size changes drastically

    for (let i = 0; i < numCircles; i++) {
        const x = Math.random() * DEFAULT_TEXTURE_WIDTH;
        const y = Math.random() * DEFAULT_TEXTURE_HEIGHT;
        const radius = Math.random() * 2 + 1; // 1 to 3 pixels radius
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
 */
export function createStarrySkyTexture(
        width = DEFAULT_TEXTURE_WIDTH, 
        height = DEFAULT_TEXTURE_HEIGHT, 
        stars = 800,
        minStarSize = 0.5, // Minimum star size
        starVariation = 0.2 // Variation in star size
    ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    // Background gradient
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'darkblue');
    gradient.addColorStop(1, '#4B0082'); // Dark violet
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < stars; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        // Adjusted star radius for higher res texture, aiming for small, sharp points
        // Stars of 1 to 2 pixels radius (at 512x512 texture size, scales with size)
        const radius = (Math.random() * minStarSize + starVariation) * Math.sqrt((width * height) / (DEFAULT_TEXTURE_WIDTH * DEFAULT_TEXTURE_HEIGHT));

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = 'white';
        context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

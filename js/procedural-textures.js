import * as THREE from 'three';

// Default texture dimensions (e.g., for floral field)
const DEFAULT_TEXTURE_WIDTH = 512;
const DEFAULT_TEXTURE_HEIGHT = 512;

/**
 * Generates a procedural texture representing a floral field.
 * @returns {THREE.CanvasTexture} The generated texture.
 */
export function createFloralFieldTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = DEFAULT_TEXTURE_WIDTH;
    canvas.height = DEFAULT_TEXTURE_HEIGHT;
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
 */
export function createStarrySkyTexture() {
    const STARRY_SKY_TEXTURE_WIDTH = 2048; // Increased resolution for stars
    const STARRY_SKY_TEXTURE_HEIGHT = 2048; // Increased resolution for stars

    const canvas = document.createElement('canvas');
    canvas.width = STARRY_SKY_TEXTURE_WIDTH;
    canvas.height = STARRY_SKY_TEXTURE_HEIGHT;
    const context = canvas.getContext('2d');

    // Background gradient
    const gradient = context.createLinearGradient(0, 0, 0, STARRY_SKY_TEXTURE_HEIGHT);
    gradient.addColorStop(0, 'darkblue');
    gradient.addColorStop(1, '#4B0082'); // Dark violet
    context.fillStyle = gradient;
    context.fillRect(0, 0, STARRY_SKY_TEXTURE_WIDTH, STARRY_SKY_TEXTURE_HEIGHT);

    const numStars = 2800; // Increased number of stars for higher resolution
    for (let i = 0; i < numStars; i++) {
        const x = Math.random() * STARRY_SKY_TEXTURE_WIDTH;
        const y = Math.random() * STARRY_SKY_TEXTURE_HEIGHT;
        // Adjusted star radius for higher res texture, aiming for small, sharp points
        const radius = Math.random() * 1.25 + 0.75; // Stars of 0.75 to 2.0 pixels radius

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = 'white';
        context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

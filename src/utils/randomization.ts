export function random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomPosition(): [number, number, number] {
    return [
        random(-2, 2),
        random(0, 1),
        random(-2, 2),
    ];
}

export function randomRotation(): [number, number, number] {
    return [
        random(0, Math.PI * 2),
        random(0, Math.PI * 2),
        random(0, Math.PI * 2),
    ];
}

export function randomScale(): number {
    return random(0.7, 1.5);
}

export function randomLightIntensity(): number {
    return random(0.5, 3);
}

export function randomCameraPosition(): [number, number, number] {
    return [
        random(2, 6),
        random(1, 4),
        random(2, 6),
    ];
}

export function randomColor(): string {
    const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

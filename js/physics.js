/**
 * 2D Physics, Honeycomb Grid Math, and Collision Utility
 */

export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
        }
        return this;
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    mag() {
        return Math.sqrt(this.magSq());
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    normalize() {
        const m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
        return this;
    }

    dist(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    static fromAngle(angle, length = 1) {
        return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
    }
}

export const Physics = {
    GRID_RADIUS: 42, // Radius of grid bubbles (yields 6~7 bubbles across narrower 600~640px canvas)
    
    getRowHeight() {
        return this.GRID_RADIUS * 1.85; 
    },

    getColWidth() {
        return this.GRID_RADIUS * 2;
    },

    // Convert grid (row, col) to canvas (x, y)
    gridToWorld(row, col, gridOffsetY, canvasWidth, customRadius = null) {
        const radius = customRadius || this.GRID_RADIUS;
        const colWidth = radius * 2;
        const rowHeight = radius * 1.85;
        const maxCols = Math.min(7, Math.max(4, Math.floor(canvasWidth / colWidth)));
        const marginX = Math.max(0, (canvasWidth - (maxCols * colWidth)) / 2);

        const x = marginX + col * colWidth + radius;
        const y = gridOffsetY + row * rowHeight + radius;
        return { x, y };
    },

    // Get neighbors for a cell in packed grid
    getHexNeighbors(row, col, maxRows, maxCols) {
        const neighbors = [];
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < maxRows && nc >= 0 && nc < maxCols) {
                neighbors.push({ r: nr, c: nc });
            }
        }
        return neighbors;
    },

    // Flood-fill connectivity check from row 0 to find floating disconnected bubbles (Avalanche)
    findFloatingBubbles(grid, maxRows, maxCols) {
        const visited = new Set();
        const queue = [];

        // Start from all bubbles attached to row 0
        for (let c = 0; c < maxCols; c++) {
            const b = grid[0]?.[c];
            if (b && !b.dead && !b.isFalling) {
                const key = `0,${c}`;
                visited.add(key);
                queue.push({ r: 0, c });
            }
        }

        // BFS traversal
        while (queue.length > 0) {
            const curr = queue.shift();
            const neighbors = this.getHexNeighbors(curr.r, curr.c, maxRows, maxCols);
            for (const n of neighbors) {
                const b = grid[n.r]?.[n.c];
                const key = `${n.r},${n.c}`;
                if (b && !b.dead && !b.isFalling && !visited.has(key)) {
                    visited.add(key);
                    queue.push(n);
                }
            }
        }

        // Any existing bubble not visited is floating!
        const floating = [];
        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < maxCols; c++) {
                const b = grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    const key = `${r},${c}`;
                    if (!visited.has(key)) {
                        floating.push(b);
                    }
                }
            }
        }

        return floating;
    },

    // Circle vs Circle collision
    checkCircleOverlap(c1, c2) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = c1.radius + c2.radius;
        return distSq <= radiusSum * radiusSum;
    },

    // Handle elastic bounce between Bullet and Bubble
    resolveBulletBubbleBounce(bullet, bubble, pushDownImpulse = 18) {
        const dx = bullet.x - bubble.x;
        const dy = bullet.y - bubble.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) dist = 0.001;

        const nx = dx / dist;
        const ny = dy / dist;

        // Reflect bullet velocity
        const dot = bullet.vx * nx + bullet.vy * ny;
        bullet.vx = (bullet.vx - 2 * dot * nx) * 0.92;
        bullet.vy = (bullet.vy - 2 * dot * ny) * 0.92;

        bullet.x = bubble.x + nx * (bubble.radius + bullet.radius + 3);
        bullet.y = bubble.y + ny * (bubble.radius + bullet.radius + 3);

        // Flash hit bubble
        bubble.flashTimer = 10;
    },

    // Raycast trajectory prediction for aiming laser with border ricochet
    calculateAimTrajectory(startX, startY, angle, width, height, maxBounces = 2, maxDistance = 900) {
        const safeAngle = isFinite(angle) ? angle : -Math.PI / 2;
        const points = [{ x: startX, y: startY }];
        let currX = startX;
        let currY = startY;
        let dirX = Math.cos(safeAngle);
        let dirY = Math.sin(safeAngle);
        if (Math.abs(dirX) < 0.0001) dirX = dirX < 0 ? -0.0001 : 0.0001;
        if (Math.abs(dirY) < 0.0001) dirY = dirY < 0 ? -0.0001 : 0.0001;
        let remainingDist = maxDistance;

        for (let b = 0; b <= maxBounces && remainingDist > 0; b++) {
            let tMin = remainingDist;
            let hitWall = null;

            if (dirX < 0) {
                const t = (12 - currX) / dirX;
                if (t > 0 && t < tMin) {
                    tMin = t;
                    hitWall = 'left';
                }
            } else if (dirX > 0) {
                const t = (width - 12 - currX) / dirX;
                if (t > 0 && t < tMin) {
                    tMin = t;
                    hitWall = 'right';
                }
            }

            if (dirY < 0) {
                const t = (10 - currY) / dirY;
                if (t > 0 && t < tMin) {
                    tMin = t;
                    hitWall = 'top';
                }
            }

            currX += dirX * tMin;
            currY += dirY * tMin;
            remainingDist -= tMin;

            points.push({ x: currX, y: currY });

            if (hitWall === 'left' || hitWall === 'right') {
                dirX = -dirX;
            } else if (hitWall === 'top') {
                break;
            } else {
                break;
            }
        }

        return points;
    }
};

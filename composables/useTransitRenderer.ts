import * as THREE from 'three';
import { ref, type Ref } from 'vue';

export interface TransitLine {
    name: string;
    color: string;
    coordinates: [number, number][];
    type: 'ubahn' | 'sbahn' | 'tram' | 'regional';
}

export interface TransitStation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    lines: string[];
    importance?: 'major' | 'minor';
}

export interface TrainPosition {
    tripId: string;
    lat: number;
    lng: number;
    lineName: string;
    direction: string;
    delay: number;
}

// Convert lat/lng to scene coordinates (simple Mercator projection)
function latLngToScene(lat: number, lng: number, scale: number = 1000): { x: number; y: number } {
    // Center on Berlin (52.52, 13.405)
    const centerLat = 52.4;
    const centerLng = 13.1;

    const x = (lng - centerLng) * scale;
    const y = (lat - centerLat) * scale;

    return { x, y };
}

export function useTransitRenderer() {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    let renderer: THREE.WebGLRenderer | null = null;
    let containerElement: HTMLElement | null = null;

    // Layers for different zoom levels
    const linesGroup = new THREE.Group();
    const stationsGroup = new THREE.Group();
    const labelsGroup = new THREE.Group();
    const trainsGroup = new THREE.Group();
    const areasGroup = new THREE.Group();

    // State
    const zoomLevel = ref(1);
    const isReady = ref(false);
    let animationFrameId: number | null = null;

    // Pan/zoom state
    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    scene.background = new THREE.Color(0x1a1a2e);

    function init(container: HTMLElement) {
        containerElement = container;

        if (!containerElement) {
            console.error('TransitRenderer: Container element is null');
            return false;
        }

        const width = containerElement.clientWidth || window.innerWidth;
        const height = containerElement.clientHeight || window.innerHeight;

        if (width === 0 || height === 0) {
            console.error('TransitRenderer: Container has zero dimensions');
            return false;
        }

        const aspect = width / height;

        // Set up orthographic camera for 2D view
        const viewSize = 150;
        camera.left = -viewSize * aspect;
        camera.right = viewSize * aspect;
        camera.top = viewSize;
        camera.bottom = -viewSize;
        camera.position.z = 100;
        camera.updateProjectionMatrix();

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerElement.appendChild(renderer.domElement);

        // Add groups to scene
        scene.add(areasGroup);
        scene.add(linesGroup);
        scene.add(stationsGroup);
        scene.add(labelsGroup);
        scene.add(trainsGroup);

        // Event listeners
        renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
        renderer.domElement.addEventListener('mousedown', handleMouseDown);
        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        renderer.domElement.addEventListener('mouseup', handleMouseUp);
        renderer.domElement.addEventListener('mouseleave', handleMouseUp);

        // Touch events for mobile
        renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        renderer.domElement.addEventListener('touchend', handleTouchEnd);

        window.addEventListener('resize', handleResize);

        // Set cursor
        renderer.domElement.style.cursor = 'grab';

        isReady.value = true;
        animate();

        console.log('TransitRenderer: Initialized successfully', { width, height });
        return true;
    }

    function handleWheel(e: WheelEvent) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel.value = Math.max(0.1, Math.min(5, zoomLevel.value * zoomFactor));
        updateCameraZoom();
        updateVisibility();
    }

    function handleMouseDown(e: MouseEvent) {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        if (renderer) renderer.domElement.style.cursor = 'grabbing';
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isPanning) return;

        const deltaX = (e.clientX - panStart.x) / zoomLevel.value;
        const deltaY = (e.clientY - panStart.y) / zoomLevel.value;

        camera.position.x -= deltaX * 0.3;
        camera.position.y += deltaY * 0.3;

        panStart = { x: e.clientX, y: e.clientY };
    }

    function handleMouseUp() {
        isPanning = false;
        if (renderer) renderer.domElement.style.cursor = 'grab';
    }

    // Touch handlers
    let lastTouchDistance = 0;

    function handleTouchStart(e: TouchEvent) {
        if (e.touches.length === 1) {
            isPanning = true;
            panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            lastTouchDistance = getTouchDistance(e.touches);
        }
        e.preventDefault();
    }

    function handleTouchMove(e: TouchEvent) {
        if (e.touches.length === 1 && isPanning) {
            const deltaX = (e.touches[0].clientX - panStart.x) / zoomLevel.value;
            const deltaY = (e.touches[0].clientY - panStart.y) / zoomLevel.value;

            camera.position.x -= deltaX * 0.3;
            camera.position.y += deltaY * 0.3;

            panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const distance = getTouchDistance(e.touches);
            const zoomFactor = distance / lastTouchDistance;
            zoomLevel.value = Math.max(0.1, Math.min(5, zoomLevel.value * zoomFactor));
            updateCameraZoom();
            updateVisibility();
            lastTouchDistance = distance;
        }
        e.preventDefault();
    }

    function handleTouchEnd() {
        isPanning = false;
        lastTouchDistance = 0;
    }

    function getTouchDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function updateCameraZoom() {
        if (!containerElement) return;

        const width = containerElement.clientWidth || window.innerWidth;
        const height = containerElement.clientHeight || window.innerHeight;
        const aspect = width / height;
        const viewSize = 150 / zoomLevel.value;

        camera.left = -viewSize * aspect;
        camera.right = viewSize * aspect;
        camera.top = viewSize;
        camera.bottom = -viewSize;
        camera.updateProjectionMatrix();
    }

    function handleResize() {
        if (!containerElement || !renderer) return;

        const width = containerElement.clientWidth;
        const height = containerElement.clientHeight;

        renderer.setSize(width, height);
        updateCameraZoom();
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        if (renderer) {
            renderer.render(scene, camera);
        }
    }

    function addLine(line: TransitLine, enabled: boolean = true) {
        const points: THREE.Vector3[] = [];

        line.coordinates.forEach(([lat, lng]) => {
            const { x, y } = latLngToScene(lat, lng);
            points.push(new THREE.Vector3(x, y, 0));
        });

        if (points.length < 2) {
            console.warn('TransitRenderer: Line has less than 2 points', line.name);
            return null;
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(line.color),
            linewidth: 2,
        });

        const lineObject = new THREE.Line(geometry, material);
        lineObject.userData = {
            lineName: line.name,
            type: line.type,
            enabled,
            importance: line.type === 'regional' ? 'major' : 'minor'
        };
        lineObject.visible = enabled;

        linesGroup.add(lineObject);
        console.log('TransitRenderer: Added line', line.name, 'with', points.length, 'points');
        return lineObject;
    }

    function addStation(station: TransitStation, color: string, enabled: boolean = true) {
        const { x, y } = latLngToScene(station.lat, station.lng);

        // Station marker (circle)
        const geometry = new THREE.CircleGeometry(1.2, 16);
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(x, y, 1);
        circle.userData = {
            stationId: station.id,
            stationName: station.name,
            lines: station.lines,
            enabled,
            importance: station.importance || 'minor'
        };
        circle.visible = enabled;

        // White border
        const borderGeometry = new THREE.RingGeometry(1.2, 1.6, 16);
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.set(x, y, 0.9);
        border.userData = { ...circle.userData };
        border.visible = enabled;

        stationsGroup.add(circle);
        stationsGroup.add(border);

        // Label (using sprite with canvas texture)
        const label = createTextSprite(station.name, color);
        label.position.set(x, y + 3, 2);
        label.userData = { ...circle.userData };
        label.visible = enabled && zoomLevel.value > 0.8;
        labelsGroup.add(label);

        return circle;
    }

    function createTextSprite(text: string, _color: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        canvas.width = 512;
        canvas.height = 64;

        context.fillStyle = 'rgba(26, 26, 46, 0.85)';
        context.beginPath();
        context.roundRect(0, 0, canvas.width, canvas.height, 8);
        context.fill();

        context.font = 'bold 28px Inter, Arial, sans-serif';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(16, 2, 1);

        return sprite;
    }

    function addTrain(train: TrainPosition, color: string) {
        const { x, y } = latLngToScene(train.lat, train.lng);

        // Train marker (larger filled circle)
        const geometry = new THREE.CircleGeometry(2, 16);
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(x, y, 3);
        circle.userData = {
            tripId: train.tripId,
            lineName: train.lineName,
            direction: train.direction,
            delay: train.delay
        };

        // Pulsing border
        const borderGeometry = new THREE.RingGeometry(2, 2.8, 16);
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.set(x, y, 2.9);

        trainsGroup.add(circle);
        trainsGroup.add(border);

        return circle;
    }

    function clearTrains() {
        while (trainsGroup.children.length > 0) {
            const child = trainsGroup.children[0];
            trainsGroup.remove(child);
            if ((child as THREE.Mesh).geometry) {
                (child as THREE.Mesh).geometry.dispose();
            }
        }
    }

    function updateTrains(trains: TrainPosition[], getColor: (lineName: string) => string) {
        clearTrains();
        trains.forEach(train => {
            addTrain(train, getColor(train.lineName));
        });
    }

    function setLineVisibility(lineName: string, visible: boolean) {
        linesGroup.children.forEach(child => {
            if (child.userData.lineName === lineName) {
                child.visible = visible;
                child.userData.enabled = visible;
            }
        });

        stationsGroup.children.forEach(child => {
            if (child.userData.lines?.includes(lineName)) {
                const hasAnyVisibleLine = child.userData.lines.some((l: string) => {
                    const lineObj = linesGroup.children.find(c => c.userData.lineName === l);
                    return lineObj?.userData.enabled;
                });
                child.visible = hasAnyVisibleLine;
                child.userData.enabled = hasAnyVisibleLine;
            }
        });

        labelsGroup.children.forEach(child => {
            if (child.userData.lines?.includes(lineName)) {
                const hasAnyVisibleLine = child.userData.lines.some((l: string) => {
                    const lineObj = linesGroup.children.find(c => c.userData.lineName === l);
                    return lineObj?.userData.enabled;
                });
                child.visible = hasAnyVisibleLine && zoomLevel.value > 0.8;
            }
        });
    }

    function updateVisibility() {
        const zoom = zoomLevel.value;

        // Update label visibility based on zoom
        labelsGroup.children.forEach(child => {
            if (child.userData.enabled) {
                if (zoom > 1.5) {
                    // Close zoom: show all labels
                    child.visible = true;
                } else if (zoom > 0.6) {
                    // Mid zoom: show major stations only
                    child.visible = child.userData.importance === 'major';
                } else {
                    // Far zoom: hide all labels except very major
                    child.visible = false;
                }
            }
        });

        // Update station marker sizes based on zoom
        stationsGroup.children.forEach(child => {
            if (child.userData.enabled && child instanceof THREE.Mesh) {
                const scale = Math.max(0.5, Math.min(1.5, 1 / zoom));
                child.scale.set(scale, scale, 1);
            }
        });

        // Update label scales
        labelsGroup.children.forEach(child => {
            if (child instanceof THREE.Sprite) {
                const scale = Math.max(0.6, Math.min(1.2, 1 / zoom));
                child.scale.set(16 * scale, 2 * scale, 1);
            }
        });
    }

    function addAreaOutline(coordinates: [number, number][], color: string = '#333344') {
        const points: THREE.Vector3[] = [];

        coordinates.forEach(([lat, lng]) => {
            const { x, y } = latLngToScene(lat, lng);
            points.push(new THREE.Vector3(x, y, -1));
        });

        // Close the loop
        if (points.length > 0) {
            points.push(points[0].clone());
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.3,
        });

        const line = new THREE.Line(geometry, material);
        areasGroup.add(line);
        return line;
    }

    function setZoom(newZoom: number) {
        zoomLevel.value = Math.max(0.1, Math.min(5, newZoom));
        updateCameraZoom();
        updateVisibility();
    }

    function resetCamera() {
        camera.position.set(0, 0, 100);
        zoomLevel.value = 1;
        updateCameraZoom();
        updateVisibility();
    }

    function destroy() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        if (renderer) {
            renderer.domElement.removeEventListener('wheel', handleWheel);
            renderer.domElement.removeEventListener('mousedown', handleMouseDown);
            renderer.domElement.removeEventListener('mousemove', handleMouseMove);
            renderer.domElement.removeEventListener('mouseup', handleMouseUp);
            renderer.domElement.removeEventListener('mouseleave', handleMouseUp);
            renderer.domElement.removeEventListener('touchstart', handleTouchStart);
            renderer.domElement.removeEventListener('touchmove', handleTouchMove);
            renderer.domElement.removeEventListener('touchend', handleTouchEnd);

            if (containerElement) {
                containerElement.removeChild(renderer.domElement);
            }
            renderer.dispose();
        }

        window.removeEventListener('resize', handleResize);
    }

    return {
        init,
        destroy,
        addLine,
        addStation,
        addTrain,
        updateTrains,
        clearTrains,
        setLineVisibility,
        updateVisibility,
        addAreaOutline,
        setZoom,
        resetCamera,
        zoomLevel,
        isReady,
        scene,
        camera,
    };
}

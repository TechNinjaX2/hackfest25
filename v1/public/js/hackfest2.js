/**
 * Smart Transport Monitor - Hackathon Demo
 * Complete working demo with simulated data - No API keys required!
 */

class SmartTransportMonitor {
    constructor() {
        this.vehicles = new Map();
        this.alerts = [];
        this.isSimulating = false;
        this.simulationInterval = null;
        this.map = null;
        this.vehicleMarkers = new Map();
        this.congestionZones = new Map();
        this.charts = {};
        this.demoRoutes = this.createDemoRoutes();
        this.alertCounter = 0;
        
        this.init();
    }

    init() {
        this.initMap();
        this.initCharts();
        this.bindEvents();
        this.loadDemoVehicles();
        this.startClock();
        this.showWelcomeMessage();
    }

    initMap() {
        // Initialize map centered on Nairobi
        this.map = L.map('map').setView([-1.286389, 36.817223], 11);
        
        // Use OpenStreetMap tiles (no API key required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Add scale control
        L.control.scale().addTo(this.map);
    }

    createDemoRoutes() {
        return [
            // Route 1: Nairobi CBD to JKIA
            [
                [-1.2833, 36.8167], // Nairobi CBD
                [-1.3000, 36.8000], // Uhuru Highway
                [-1.3200, 36.8000], // Mombasa Road
                [-1.3500, 36.8000], // JKIA Area
                [-1.3600, 36.8100]  // JKIA
            ],
            // Route 2: Westlands to Thika
            [
                [-1.2667, 36.8000], // Westlands
                [-1.2500, 36.8333], // Museum Hill
                [-1.2000, 36.8500], // Muthaiga
                [-1.1500, 36.9000], // Thika Road
                [-1.0333, 37.0833]  // Thika
            ],
            // Route 3: Karen to City Center
            [
                [-1.3167, 36.7000], // Karen
                [-1.3000, 36.7500], // Ngong Road
                [-1.2833, 36.7833], // Adams Arcade
                [-1.2833, 36.8167]  // CBD
            ]
        ];
    }

    initCharts() {
        const ctx = document.getElementById('speedChart').getContext('2d');
        this.charts.speed = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-20', '20-40', '40-60', '60-80', '80-100', '100+'],
                datasets: [{
                    label: 'Vehicles by Speed',
                    data: [2, 5, 8, 6, 3, 1],
                    backgroundColor: [
                        '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#3b82f6'
                    ],
                    borderWidth: 0,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Vehicle Speed Distribution',
                        color: '#4b5563',
                        font: { size: 14 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { color: '#6b7280' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280' }
                    }
                }
            }
        });
    }

    bindEvents() {
        document.getElementById('addVehicleBtn').addEventListener('click', () => this.addVehicle());
        document.getElementById('startAllBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('stopAllBtn').addEventListener('click', () => this.stopSimulation());
        document.getElementById('simulateCongestionBtn').addEventListener('click', () => this.simulateTrafficJam());
        
        // Keyboard shortcuts for demo
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') { // Space bar to toggle simulation
                this.isSimulating ? this.stopSimulation() : this.startSimulation();
            } else if (e.key === 'a') { // 'a' to add vehicle
                this.addVehicle();
            } else if (e.key === 'c') { // 'c' to simulate congestion
                this.simulateTrafficJam();
            }
        });
    }

    loadDemoVehicles() {
        const demoVehicles = [
            {
                id: 'v1',
                name: 'Delivery Truck 001',
                plate: 'KAA-001',
                type: 'truck',
                capacity: '5T',
                driver: 'John Mwangi'
            },
            {
                id: 'v2',
                name: 'Cargo Van 002',
                plate: 'KAB-002',
                type: 'van',
                capacity: '2T',
                driver: 'Sarah Omondi'
            },
            {
                id: 'v3',
                name: 'Logistics Trailer',
                plate: 'KAC-003',
                type: 'trailer',
                capacity: '15T',
                driver: 'David Kimani'
            },
            {
                id: 'v4',
                name: 'Express Delivery',
                plate: 'KAD-004',
                type: 'van',
                capacity: '1.5T',
                driver: 'Grace Wanjiku'
            },
            {
                id: 'v5',
                name: 'Heavy Hauler',
                plate: 'KAE-005',
                type: 'truck',
                capacity: '20T',
                driver: 'Peter Maina'
            }
        ];

        demoVehicles.forEach(vehicle => this.addVehicle(vehicle));
    }

    addVehicle(vehicleData = null) {
        const vehicleId = vehicleData?.id || `v-${Date.now()}`;
        const vehicle = vehicleData || {
            id: vehicleId,
            name: `Vehicle ${this.vehicles.size + 1}`,
            plate: `KAA-${String(this.vehicles.size + 1).padStart(3, '0')}`,
            type: ['truck', 'van', 'trailer'][Math.floor(Math.random() * 3)],
            capacity: `${Math.floor(Math.random() * 20) + 1}T`,
            driver: `Driver ${this.vehicles.size + 1}`
        };

        // Initialize vehicle state
        const randomRoute = this.demoRoutes[Math.floor(Math.random() * this.demoRoutes.length)];
        vehicle.state = {
            position: { lat: randomRoute[0][0], lng: randomRoute[0][1] },
            speed: 0,
            distance: 0,
            status: 'stopped',
            route: randomRoute,
            currentRouteIndex: 0,
            lastUpdate: Date.now(),
            color: this.getRandomColor()
        };

        this.vehicles.set(vehicleId, vehicle);
        this.createVehicleMarker(vehicle);
        this.updateVehicleList();
        this.updateMetrics();

        this.addAlert(`Vehicle ${vehicle.name} added to fleet`, 'info');
    }

    getRandomColor() {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    createVehicleMarker(vehicle) {
        const icons = {
            truck: '🚚',
            van: '🚐',
            trailer: '🚛'
        };

        const icon = L.divIcon({
            className: 'vehicle-marker',
            html: `
                <div style="
                    background: ${vehicle.state.color};
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    transform: rotate(45deg);
                ">
                    ${icons[vehicle.type] || '🚗'}
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const marker = L.marker([vehicle.state.position.lat, vehicle.state.position.lng], { icon })
            .addTo(this.map)
            .bindPopup(this.getVehiclePopup(vehicle));

        // Add route polyline
        const routePolyline = L.polyline(vehicle.state.route, {
            color: vehicle.state.color,
            weight: 3,
            opacity: 0.5,
            dashArray: '5, 10'
        }).addTo(this.map);

        vehicle.state.routePolyline = routePolyline;

        this.vehicleMarkers.set(vehicle.id, { marker, routePolyline });
    }

    getVehiclePopup(vehicle) {
        return `
            <div style="min-width: 200px; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 10px 0; color: #2d3748;">${vehicle.name}</h3>
                <div style="display: grid; gap: 5px; font-size: 14px;">
                    <div><strong>Plate:</strong> ${vehicle.plate}</div>
                    <div><strong>Type:</strong> ${vehicle.type}</div>
                    <div><strong>Driver:</strong> ${vehicle.driver}</div>
                    <div><strong>Capacity:</strong> ${vehicle.capacity}</div>
                    <div><strong>Speed:</strong> ${vehicle.state.speed} km/h</div>
                    <div><strong>Status:</strong> <span style="color: ${
                        vehicle.state.status === 'moving' ? '#10b981' : 
                        vehicle.state.status === 'congested' ? '#f59e0b' : '#ef4444'
                    }">${vehicle.state.status.toUpperCase()}</span></div>
                </div>
            </div>
        `;
    }

    startSimulation() {
        if (this.isSimulating) return;
        
        this.isSimulating = true;
        this.simulationInterval = setInterval(() => {
            this.simulateMovement();
            this.detectCongestion();
            this.checkForAlerts();
            this.updateDisplay();
        }, 1000);

        this.addAlert('Simulation started - All vehicles are now moving', 'info');
        this.updateDemoMetrics();
    }

    stopSimulation() {
        this.isSimulating = false;
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }

        // Stop all vehicles
        this.vehicles.forEach(vehicle => {
            vehicle.state.speed = 0;
            vehicle.state.status = 'stopped';
        });

        this.addAlert('Simulation stopped - All vehicles halted', 'info');
        this.updateDisplay();
    }

    simulateMovement() {
        this.vehicles.forEach(vehicle => {
            if (vehicle.state.status === 'stopped') {
                // Start moving
                vehicle.state.speed = 40 + Math.random() * 60; // 40-100 km/h
                vehicle.state.status = 'moving';
            }

            // Move along route
            const route = vehicle.state.route;
            if (vehicle.state.currentRouteIndex < route.length - 1) {
                const currentPoint = route[vehicle.state.currentRouteIndex];
                const nextPoint = route[vehicle.state.currentRouteIndex + 1];
                
                // Move towards next point
                const latDiff = nextPoint[0] - currentPoint[0];
                const lngDiff = nextPoint[1] - currentPoint[1];
                
                // Update position (simplified movement)
                const progress = 0.02 + (Math.random() * 0.03);
                vehicle.state.position.lat += latDiff * progress;
                vehicle.state.position.lng += lngDiff * progress;
                
                // Check if reached next point
                const distanceToNext = Math.sqrt(
                    Math.pow(vehicle.state.position.lat - nextPoint[0], 2) +
                    Math.pow(vehicle.state.position.lng - nextPoint[1], 2)
                );
                
                if (distanceToNext < 0.005) {
                    vehicle.state.currentRouteIndex++;
                    if (vehicle.state.currentRouteIndex >= route.length - 1) {
                        // Reached destination, start over
                        vehicle.state.currentRouteIndex = 0;
                        vehicle.state.position = { lat: route[0][0], lng: route[0][1] };
                    }
                }

                // Update distance (simplified calculation)
                vehicle.state.distance += vehicle.state.speed / 3.6; // meters per second
            }

            // Update marker position
            const markerData = this.vehicleMarkers.get(vehicle.id);
            if (markerData) {
                markerData.marker.setLatLng([vehicle.state.position.lat, vehicle.state.position.lng]);
            }
        });
    }

    detectCongestion() {
        // Simulate random congestion events
        this.vehicles.forEach(vehicle => {
            if (vehicle.state.status === 'moving' && Math.random() < 0.02) {
                // 2% chance per second to enter congestion
                vehicle.state.speed = 5 + Math.random() * 15; // 5-20 km/h
                vehicle.state.status = 'congested';
                this.createCongestionZone(vehicle.state.position);
                this.addAlert(`Congestion detected for ${vehicle.name} (${vehicle.state.speed.toFixed(1)} km/h)`, 'congestion');
            } else if (vehicle.state.status === 'congested' && Math.random() < 0.05) {
                // 5% chance to clear congestion
                vehicle.state.speed = 40 + Math.random() * 60;
                vehicle.state.status = 'moving';
                this.addAlert(`Congestion cleared for ${vehicle.name}`, 'info');
            }

            // Random speed variations
            if (vehicle.state.status === 'moving') {
                const variation = (Math.random() - 0.5) * 20; // ±10 km/h variation
                vehicle.state.speed = Math.max(10, Math.min(120, vehicle.state.speed + variation));
            }
        });
    }

    createCongestionZone(position) {
        const zoneId = `congestion-${Date.now()}-${Math.random()}`;
        
        const circle = L.circle([position.lat, position.lng], {
            color: '#f59e0b',
            fillColor: '#fef3c7',
            fillOpacity: 0.3,
            radius: 300
        }).addTo(this.map).bindPopup('Traffic Congestion Zone');

        this.congestionZones.set(zoneId, circle);

        // Remove after 30 seconds
        setTimeout(() => {
            this.removeCongestionZone(zoneId);
        }, 30000);
    }

    removeCongestionZone(zoneId) {
        const circle = this.congestionZones.get(zoneId);
        if (circle) {
            this.map.removeLayer(circle);
            this.congestionZones.delete(zoneId);
        }
    }

    checkForAlerts() {
        // Simulate random alerts
        if (Math.random() < 0.03) { // 3% chance per second
            const vehiclesArray = Array.from(this.vehicles.values());
            const randomVehicle = vehiclesArray[Math.floor(Math.random() * vehiclesArray.length)];
            
            const alertTypes = [
                {
                    type: 'speeding',
                    message: `${randomVehicle.name} is speeding (${(randomVehicle.state.speed + 20).toFixed(1)} km/h)`,
                    condition: randomVehicle.state.speed > 80
                },
                {
                    type: 'congestion',
                    message: `Heavy traffic building up near ${randomVehicle.name}'s location`,
                    condition: Math.random() < 0.5
                },
                {
                    type: 'info',
                    message: `${randomVehicle.name} has covered ${(randomVehicle.state.distance / 1000).toFixed(1)} km`,
                    condition: Math.random() < 0.3
                }
            ];

            const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
            if (randomAlert.condition) {
                this.addAlert(randomAlert.message, randomAlert.type);
            }
        }
    }

    simulateTrafficJam() {
        this.addAlert('🚨 SIMULATING MAJOR TRAFFIC JAM IN CENTRAL AREA', 'congestion');
        
        // Create a large congestion zone in central Nairobi
        const centralZone = L.circle([-1.2833, 36.8167], {
            color: '#ef4444',
            fillColor: '#fecaca',
            fillOpacity: 0.4,
            radius: 800
        }).addTo(this.map).bindPopup('MAJOR TRAFFIC JAM - AVOID AREA');

        this.congestionZones.set('major-jam', centralZone);

        // Slow down vehicles in the central area
        this.vehicles.forEach(vehicle => {
            const distanceToCenter = Math.sqrt(
                Math.pow(vehicle.state.position.lat - (-1.2833), 2) +
                Math.pow(vehicle.state.position.lng - 36.8167, 2)
            );
            
            if (distanceToCenter < 0.02) { // Within ~2km of center
                vehicle.state.speed = 5 + Math.random() * 10;
                vehicle.state.status = 'congested';
            }
        });

        // Remove major jam after 45 seconds
        setTimeout(() => {
            this.removeCongestionZone('major-jam');
            this.addAlert('Central area traffic jam cleared', 'info');
        }, 45000);
    }

    addAlert(message, type = 'info') {
        const alert = {
            id: this.alertCounter++,
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        this.alerts.unshift(alert);
        
        // Keep only last 10 alerts
        if (this.alerts.length > 10) {
            this.alerts.pop();
        }

        this.updateAlertDisplay();
        
        // Show browser notification if permitted
        this.showBrowserNotification(message, type);
    }

    showBrowserNotification(message, type) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Transport Alert: ${type.toUpperCase()}`, {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚗</text></svg>'
            });
        }
    }

    updateAlertDisplay() {
        const alertPanel = document.getElementById('alertPanel');
        alertPanel.innerHTML = '';

        this.alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `alert-item alert-${alert.type}`;
            alertElement.innerHTML = `
                <div class="alert-header">
                    <div class="alert-title">${alert.type.toUpperCase()} ALERT</div>
                    <div class="alert-time">${alert.timestamp}</div>
                </div>
                <div class="alert-message">${alert.message}</div>
            `;
            alertPanel.appendChild(alertElement);
        });
    }

    updateVehicleList() {
        const vehicleList = document.getElementById('vehicleList');
        vehicleList.innerHTML = '';

        this.vehicles.forEach(vehicle => {
            const vehicleElement = document.createElement('div');
            vehicleElement.className = `vehicle-item ${vehicle.state.status}`;
            vehicleElement.innerHTML = `
                <div class="vehicle-icon">
                    ${vehicle.type === 'truck' ? '🚚' : vehicle.type === 'van' ? '🚐' : '🚛'}
                </div>
                <div class="vehicle-info">
                    <h4>${vehicle.name}</h4>
                    <div class="vehicle-meta">${vehicle.plate} • ${vehicle.driver}</div>
                </div>
                <div class="vehicle-status">
                    <div class="status-badge status-${vehicle.state.status}">
                        ${vehicle.state.status.toUpperCase()}
                    </div>
                    <div style="font-size: 0.9rem; color: #4b5563; margin-top: 2px;">
                        ${vehicle.state.speed.toFixed(0)} km/h
                    </div>
                </div>
            `;
            vehicleList.appendChild(vehicleElement);
        });
    }

    updateMetrics() {
        let totalDistance = 0;
        let totalSpeed = 0;
        let activeCount = 0;
        let congestionCount = 0;

        this.vehicles.forEach(vehicle => {
            totalDistance += vehicle.state.distance;
            totalSpeed += vehicle.state.speed;
            
            if (vehicle.state.status !== 'stopped') {
                activeCount++;
            }
            
            if (vehicle.state.status === 'congested') {
                congestionCount++;
            }
        });

        const avgSpeed = this.vehicles.size > 0 ? totalSpeed / this.vehicles.size : 0;

        // Update KPI displays
        document.getElementById('avgSpeed').textContent = `${avgSpeed.toFixed(1)} km/h`;
        document.getElementById('totalDistance').textContent = `${(totalDistance / 1000).toFixed(1)} km`;
        document.getElementById('activeVehicles').textContent = activeCount;
        document.getElementById('congestionAlerts').textContent = this.alerts.filter(a => a.type === 'congestion').length;

        // Update driver advisory with first vehicle's data
        this.updateDriverAdvisory();
    }

    updateDemoMetrics() {
        // Update chart with realistic demo data
        if (this.charts.speed) {
            const newData = [1, 4, 7, 5, 2, 1].map(val => val + Math.floor(Math.random() * 3));
            this.charts.speed.data.datasets[0].data = newData;
            this.charts.speed.update();
        }
    }

    updateDriverAdvisory() {
        const vehiclesArray = Array.from(this.vehicles.values());
        if (vehiclesArray.length > 0) {
            const sampleVehicle = vehiclesArray[0];
            
            document.getElementById('driverSpeed').textContent = `${sampleVehicle.state.speed.toFixed(1)} km/h`;
            document.getElementById('roadCondition').textContent = 
                sampleVehicle.state.status === 'congested' ? 'Heavy Traffic' : 'Clear';
            document.getElementById('nextAlert').textContent = 
                sampleVehicle.state.speed > 90 ? 'Speed Warning' : 'Monitor Traffic';
            document.getElementById('driverRecommendation').textContent = 
                sampleVehicle.state.status === 'congested' ? 'Find alternative route' : 'Continue current route';
        }
    }

    updateDisplay() {
        this.updateVehicleList();
        this.updateMetrics();
    }

    startClock() {
        setInterval(() => {
            document.getElementById('currentTime').textContent = new Date().toLocaleTimeString();
        }, 1000);
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.addAlert('Welcome to Smart Transport Monitor! Click "Start All" to begin simulation.', 'info');
        }, 1000);
        
        setTimeout(() => {
            this.addAlert('💡 DEMO TIP: Press SPACE to start/stop, A to add vehicle, C to simulate traffic jam', 'info');
        }, 3000);
    }
}

// Initialize the application when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.transportMonitor = new SmartTransportMonitor();
});

// Request notification permission
if ('Notification' in window) {
    Notification.requestPermission();
}

// Add some demo tips to console
console.log(`
🚗 SMART TRANSPORT MONITOR - HACKATHON DEMO
===========================================

DEMO FEATURES:
✅ Real-time vehicle tracking
✅ Congestion detection & alerts  
✅ Speed monitoring
✅ Distance tracking
✅ Driver advisory system
✅ Interactive map
✅ Live metrics dashboard

KEYBOARD SHORTCUTS:
📍 SPACE - Start/Stop simulation
📍 A - Add new vehicle
📍 C - Simulate traffic jam

QUICK START:
1. Click "Start All" or press SPACE
2. Watch vehicles move in real-time
3. Click "Simulate Jam" to test alerts
4. Monitor metrics and warnings

Enjoy the demo! 🎉
`);
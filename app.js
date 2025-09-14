// Vigilance Command - Threat Detection System
// Palantir Gotham-style Dashboard Implementation

class VigilanceCommand {
    constructor() {
        this.events = [];
        this.sensors = [];
        this.map = null;
        this.markers = [];
        this.isConnected = true;
        this.eventCounts = {
            benign: 0,
            suspicious: 0,
            critical: 0
        };
        
        this.init();
    }

    async init() {
        console.log('🛡️ Vigilance Command System Initializing...');
        
        this.setupEventListeners();
        this.initializeSensors();
        this.startSystemTime();
        this.initializeMap();
        this.startThreatGeneration();
        this.startRealTimeUpdates();
        
        console.log('✅ Vigilance Command System Online');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Map controls
        const mapRefresh = document.getElementById('mapRefresh');
        const mapExpand = document.getElementById('mapExpand');
        
        if (mapRefresh) {
            mapRefresh.addEventListener('click', () => this.refreshMap());
        }
        
        if (mapExpand) {
            mapExpand.addEventListener('click', () => this.expandMap());
        }

        // Modal controls
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        // Click outside modal to close
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Event feed item clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.event-item')) {
                this.showEventDetails(e.target.closest('.event-item'));
            }
        });
    }

    initializeSensors() {
        this.sensors = [
            { id: 'drone_01', name: 'DRONE_01', status: 'active', location: [34.0522, -118.2437] },
            { id: 'drone_23', name: 'DRONE_23', status: 'active', location: [34.1021, -118.1234] },
            { id: 'radar_07', name: 'RADAR_07', status: 'active', location: [34.0892, -118.3012] },
            { id: 'radar_12', name: 'RADAR_12', status: 'warning', location: [34.1156, -118.2789] },
            { id: 'sensor_45', name: 'SENSOR_45', status: 'active', location: [34.0745, -118.2456] },
            { id: 'cam_18', name: 'CAM_18', status: 'critical', location: [34.0967, -118.2123] }
        ];
        
        this.updateSensorStatus();
    }

    updateSensorStatus() {
        const sensorList = document.getElementById('sensorList');
        if (!sensorList) return;

        sensorList.innerHTML = this.sensors.map(sensor => `
            <div class="sensor-item">
                <span class="sensor-name">${sensor.name}</span>
                <div class="sensor-status-indicator ${sensor.status}"></div>
            </div>
        `).join('');
    }

    startSystemTime() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/(\d+)\/(\d+)\/(\d+),?\s*/, '$3-$1-$2 ');
            
            const timeElement = document.getElementById('systemTime');
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        };

        updateTime();
        setInterval(updateTime, 1000);
    }

    async initializeMap() {
        try {
            // Set Mapbox access token - using a demo token, replace with your own
            mapboxgl.accessToken = 'pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2xrZ3l6cWs2MWI4bDNsbjI0OHUzZDkweiJ9.demo_token_here';
            
            this.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/dark-v10',
                center: [-118.2437, 34.0522], // Los Angeles
                zoom: 10,
                pitch: 45,
                bearing: -17.6,
                attributionControl: false
            });

            this.map.on('load', () => {
                console.log('🗺️ Tactical Map Loaded');
                this.addMapSources();
                this.addMapLayers();
            });

        } catch (error) {
            console.warn('⚠️ Mapbox not available, using fallback map');
            this.initializeFallbackMap();
        }
    }

    initializeFallbackMap() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #1a1d24 0%, #2c2f36 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #a0a6b1;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-image: 
                            radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(255, 77, 77, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(0, 255, 148, 0.1) 0%, transparent 50%);
                    "></div>
                    <i class="fas fa-map" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <h3 style="margin-bottom: 8px; font-size: 18px;">TACTICAL MAP</h3>
                    <p style="text-align: center; font-size: 14px; opacity: 0.7;">Real-time threat visualization</p>
                    <div class="fallback-markers" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>
                </div>
            `;
            
            this.createFallbackMarkers();
        }
    }

    createFallbackMarkers() {
        const markersContainer = document.querySelector('.fallback-markers');
        if (!markersContainer) return;

        const markerPositions = [
            { x: 30, y: 40, type: 'critical' },
            { x: 60, y: 30, type: 'warning' },
            { x: 45, y: 65, type: 'benign' },
            { x: 75, y: 50, type: 'warning' },
            { x: 25, y: 70, type: 'benign' }
        ];

        markerPositions.forEach((pos, index) => {
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute;
                left: ${pos.x}%;
                top: ${pos.y}%;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.5);
                transform: translate(-50%, -50%);
                animation: markerPulse 2s infinite;
                animation-delay: ${index * 0.4}s;
            `;

            switch (pos.type) {
                case 'critical':
                    marker.style.background = '#FF4D4D';
                    marker.style.boxShadow = '0 0 15px rgba(255, 77, 77, 0.6)';
                    break;
                case 'warning':
                    marker.style.background = '#FFC14D';
                    marker.style.boxShadow = '0 0 15px rgba(255, 193, 77, 0.6)';
                    break;
                case 'benign':
                    marker.style.background = '#00FF94';
                    marker.style.boxShadow = '0 0 15px rgba(0, 255, 148, 0.6)';
                    break;
            }

            markersContainer.appendChild(marker);
        });
    }

    addMapSources() {
        if (!this.map) return;

        this.map.addSource('threats', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    }

    addMapLayers() {
        if (!this.map) return;

        // Add threat markers layer
        this.map.addLayer({
            id: 'threat-markers',
            type: 'circle',
            source: 'threats',
            paint: {
                'circle-radius': [
                    'case',
                    ['==', ['get', 'threat_level'], 5], 12,
                    ['==', ['get', 'threat_level'], 4], 10,
                    ['==', ['get', 'threat_level'], 3], 8,
                    6
                ],
                'circle-color': [
                    'case',
                    ['>=', ['get', 'threat_level'], 4], '#FF4D4D',
                    ['==', ['get', 'threat_level'], 3], '#FFC14D',
                    '#00FF94'
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
                'circle-opacity': 0.8
            }
        });

        // Add pulse effect for critical threats
        this.map.addLayer({
            id: 'threat-pulse',
            type: 'circle',
            source: 'threats',
            filter: ['>=', ['get', 'threat_level'], 4],
            paint: {
                'circle-radius': {
                    stops: [[0, 15], [1, 25]]
                },
                'circle-color': '#FF4D4D',
                'circle-opacity': {
                    stops: [[0, 0.8], [1, 0]]
                }
            }
        });
    }

    startThreatGeneration() {
        const generateThreat = () => {
            const threat = this.generateRandomThreat();
            this.addThreatEvent(threat);
            
            // Schedule next threat generation (1-5 seconds)
            const nextInterval = Math.random() * 4000 + 1000;
            setTimeout(generateThreat, nextInterval);
        };

        // Start generating threats after 2 seconds
        setTimeout(generateThreat, 2000);
    }

    generateRandomThreat() {
        const sensorTypes = ['drone', 'radar', 'sensor', 'cam'];
        const threatTypes = ['movement_detected', 'anomaly', 'signal', 'intrusion', 'suspicious_activity'];
        const locations = [
            [34.0522, -118.2437], // LA Downtown
            [34.1021, -118.1234], // Hollywood
            [34.0892, -118.3012], // Beverly Hills
            [34.1156, -118.2789], // West Hollywood
            [34.0745, -118.2456], // Koreatown
            [34.0967, -118.2123], // Silver Lake
            [34.0408, -118.2512], // USC Area
            [34.0689, -118.1987]  // Arts District
        ];

        const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
        const sensorNumber = String(Math.floor(Math.random() * 50) + 1).padStart(2, '0');
        const sensorId = `${sensorType}_${sensorNumber}`;
        
        const location = locations[Math.floor(Math.random() * locations.length)];
        // Add some random variation to location
        const lat = location[0] + (Math.random() - 0.5) * 0.02;
        const lng = location[1] + (Math.random() - 0.5) * 0.02;

        const threatLevel = this.generateThreatLevel();
        const confidence = Math.random() * 0.4 + 0.6; // 0.6 - 1.0

        return {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            sensor_id: sensorId,
            location: [lat, lng],
            threat_level: threatLevel,
            confidence: confidence,
            type: threatTypes[Math.floor(Math.random() * threatTypes.length)]
        };
    }

    generateThreatLevel() {
        const rand = Math.random();
        if (rand < 0.6) return Math.floor(Math.random() * 2) + 1; // 1-2 (benign)
        if (rand < 0.85) return 3; // suspicious
        return Math.floor(Math.random() * 2) + 4; // 4-5 (critical)
    }

    addThreatEvent(threat) {
        this.events.unshift(threat);
        
        // Keep only last 50 events
        if (this.events.length > 50) {
            this.events = this.events.slice(0, 50);
        }

        this.updateEventCounts();
        this.updateEventFeed();
        this.updateMap(threat);
        this.updateAnalytics();
        
        // Play alert sound for critical threats
        if (threat.threat_level >= 4) {
            this.playAlertSound();
        }
    }

    updateEventCounts() {
        this.eventCounts = {
            benign: this.events.filter(e => e.threat_level <= 2).length,
            suspicious: this.events.filter(e => e.threat_level === 3).length,
            critical: this.events.filter(e => e.threat_level >= 4).length
        };
    }

    updateEventFeed() {
        const eventFeed = document.getElementById('eventFeed');
        if (!eventFeed) return;

        const recentEvents = this.events.slice(0, 20);
        eventFeed.innerHTML = recentEvents.map(event => {
            const severity = event.threat_level >= 4 ? 'critical' : 
                           event.threat_level === 3 ? 'warning' : 'benign';
            
            return `
                <div class="event-item ${severity}" data-event-id="${event.id}">
                    <div class="event-header">
                        <span class="event-sensor">${event.sensor_id}</span>
                        <span class="event-timestamp">${this.formatTimestamp(event.timestamp)}</span>
                    </div>
                    <div class="event-details">
                        <div class="event-type">${event.type.replace(/_/g, ' ')}</div>
                        <div class="event-location">LAT: ${event.location[0].toFixed(4)} LNG: ${event.location[1].toFixed(4)}</div>
                        <div class="event-confidence">
                            <span>Confidence:</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill ${severity}" style="width: ${(event.confidence * 100)}%"></div>
                            </div>
                            <span>${(event.confidence * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateMap(threat) {
        if (this.map && this.map.getSource('threats')) {
            const features = this.events.slice(0, 30).map(event => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [event.location[1], event.location[0]]
                },
                properties: {
                    threat_level: event.threat_level,
                    sensor_id: event.sensor_id,
                    type: event.type,
                    confidence: event.confidence,
                    timestamp: event.timestamp
                }
            }));

            this.map.getSource('threats').setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }

    updateAnalytics() {
        // Update metric cards
        document.getElementById('benignCount').textContent = this.eventCounts.benign;
        document.getElementById('suspiciousCount').textContent = this.eventCounts.suspicious;
        document.getElementById('criticalCount').textContent = this.eventCounts.critical;

        // Update distribution bars
        const total = this.eventCounts.benign + this.eventCounts.suspicious + this.eventCounts.critical;
        if (total > 0) {
            const benignPercent = (this.eventCounts.benign / total) * 100;
            const suspiciousPercent = (this.eventCounts.suspicious / total) * 100;
            const criticalPercent = (this.eventCounts.critical / total) * 100;

            document.getElementById('benignBar').style.width = `${benignPercent}%`;
            document.getElementById('suspiciousBar').style.width = `${suspiciousPercent}%`;
            document.getElementById('criticalBar').style.width = `${criticalPercent}%`;
        }
    }

    showEventDetails(eventElement) {
        const eventId = eventElement.dataset.eventId;
        const event = this.events.find(e => e.id == eventId);
        
        if (!event) return;

        const modal = document.getElementById('eventModal');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalBody) return;

        const severity = event.threat_level >= 4 ? 'CRITICAL' : 
                        event.threat_level === 3 ? 'SUSPICIOUS' : 'BENIGN';
        const severityClass = event.threat_level >= 4 ? 'critical' : 
                             event.threat_level === 3 ? 'warning' : 'benign';

        modalBody.innerHTML = `
            <div style="display: grid; gap: 20px;">
                <div class="detail-section">
                    <h4>EVENT CLASSIFICATION</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Threat Level:</span>
                            <span class="detail-value ${severityClass}">${severity} (${event.threat_level}/5)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Confidence:</span>
                            <span class="detail-value">${(event.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Event Type:</span>
                            <span class="detail-value">${event.type.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>SENSOR INFORMATION</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Sensor ID:</span>
                            <span class="detail-value sensor-id">${event.sensor_id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Timestamp:</span>
                            <span class="detail-value timestamp">${this.formatFullTimestamp(event.timestamp)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>GEOLOCATION DATA</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Latitude:</span>
                            <span class="detail-value coordinates">${event.location[0].toFixed(6)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Longitude:</span>
                            <span class="detail-value coordinates">${event.location[1].toFixed(6)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>RECOMMENDED ACTIONS</h4>
                    <ul class="action-list">
                        ${this.getRecommendedActions(event).map(action => 
                            `<li>${action}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;

        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .detail-section {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-base);
                padding: var(--space-lg);
            }
            .detail-section h4 {
                font-size: var(--font-size-sm);
                font-weight: 600;
                color: var(--text-primary);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: var(--space-md);
                border-bottom: 1px solid var(--border-color);
                padding-bottom: var(--space-sm);
            }
            .detail-grid {
                display: grid;
                gap: var(--space-md);
            }
            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .detail-label {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                font-weight: 500;
            }
            .detail-value {
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                color: var(--text-primary);
                font-weight: 600;
            }
            .detail-value.critical { color: var(--color-critical); }
            .detail-value.warning { color: var(--color-warning); }
            .detail-value.benign { color: var(--color-benign); }
            .sensor-id, .coordinates, .timestamp {
                background: rgba(0, 212, 255, 0.1);
                padding: 2px 6px;
                border-radius: var(--radius-sm);
                border: 1px solid rgba(0, 212, 255, 0.2);
            }
            .action-list {
                list-style: none;
                padding: 0;
            }
            .action-list li {
                padding: var(--space-sm);
                margin-bottom: var(--space-sm);
                background: rgba(0, 212, 255, 0.05);
                border-left: 3px solid var(--color-info);
                border-radius: var(--radius-sm);
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);

        modal.classList.remove('hidden');
        modal.classList.add('show');
    }

    getRecommendedActions(event) {
        const actions = [];
        
        if (event.threat_level >= 4) {
            actions.push('IMMEDIATE: Alert security personnel');
            actions.push('Deploy rapid response team to coordinates');
            actions.push('Establish perimeter around threat zone');
            actions.push('Activate emergency protocols');
        } else if (event.threat_level === 3) {
            actions.push('Increase surveillance in target area');
            actions.push('Notify patrol units of suspicious activity');
            actions.push('Monitor for escalation patterns');
        } else {
            actions.push('Log event for pattern analysis');
            actions.push('Continue routine monitoring');
            actions.push('Update threat assessment database');
        }
        
        if (event.confidence < 0.8) {
            actions.push('Request additional sensor verification');
        }
        
        return actions;
    }

    closeModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }

    playAlertSound() {
        // Create audio context for alert sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('Audio alert not available');
        }
    }

    startRealTimeUpdates() {
        // Update sensor statuses periodically
        setInterval(() => {
            this.sensors.forEach(sensor => {
                if (Math.random() < 0.05) { // 5% chance of status change
                    const statuses = ['active', 'warning', 'critical'];
                    sensor.status = statuses[Math.floor(Math.random() * statuses.length)];
                }
            });
            this.updateSensorStatus();
        }, 10000);

        // Simulate connection status changes
        setInterval(() => {
            if (Math.random() < 0.02) { // 2% chance of connection issue
                this.simulateConnectionIssue();
            }
        }, 15000);
    }

    simulateConnectionIssue() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            statusDot.classList.remove('status-online');
            statusDot.style.background = '#FFC14D';
            statusText.textContent = 'RECONNECTING';
            statusText.style.color = '#FFC14D';
            
            // Restore connection after 2-5 seconds
            setTimeout(() => {
                statusDot.classList.add('status-online');
                statusDot.style.background = '';
                statusText.textContent = 'ONLINE';
                statusText.style.color = '';
            }, Math.random() * 3000 + 2000);
        }
    }

    handleNavigation(e) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        const section = e.currentTarget.dataset.section;
        console.log(`📊 Navigating to ${section} section`);
        
        // In a real app, this would switch views
        this.showNotification(`Switched to ${section.toUpperCase()} view`, 'info');
    }

    refreshMap() {
        console.log('🔄 Refreshing tactical map...');
        if (this.map) {
            this.map.flyTo({
                center: [-118.2437, 34.0522],
                zoom: 10,
                duration: 1000
            });
        }
        this.showNotification('Map refreshed', 'success');
    }

    expandMap() {
        console.log('🔍 Expanding map view...');
        const mapPanel = document.querySelector('.map-panel');
        if (mapPanel) {
            mapPanel.style.transform = 'scale(1.02)';
            mapPanel.style.zIndex = '10';
            setTimeout(() => {
                mapPanel.style.transform = '';
                mapPanel.style.zIndex = '';
            }, 300);
        }
        this.showNotification('Map view expanded', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-base)',
            padding: 'var(--space-md)',
            minWidth: '300px',
            zIndex: '1001',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            boxShadow: 'var(--shadow-lg)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--font-size-sm)'
        });

        const colors = {
            success: 'var(--color-benign)',
            warning: 'var(--color-warning)',
            error: 'var(--color-critical)',
            info: 'var(--color-info)'
        };

        notification.style.borderLeftColor = colors[type] || colors.info;
        notification.querySelector('i').style.color = colors[type] || colors.info;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.closeNotification(notification));

        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.closeNotification(notification);
            }
        }, 4000);
    }

    closeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatFullTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
}

// Add notification styles
const notificationStyles = `
    .notification {
        backdrop-filter: blur(10px);
    }
    
    .notification i {
        font-size: 16px;
        min-width: 16px;
    }
    
    .notification span {
        flex: 1;
        color: var(--text-primary);
        font-weight: 500;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
        font-size: 12px;
    }
    
    .notification-close:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.vigilanceCommand = new VigilanceCommand();
});

// Add global utilities
window.VigilanceUtils = {
    formatCoordinates: (lat, lng) => {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    },
    
    getThreatLevelText: (level) => {
        const levels = {
            1: 'LOW',
            2: 'ELEVATED', 
            3: 'SUSPICIOUS',
            4: 'HIGH',
            5: 'CRITICAL'
        };
        return levels[level] || 'UNKNOWN';
    },
    
    generateMissionCode: () => {
        const prefixes = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'];
        const numbers = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        return `${prefix}-${numbers}`;
    }
};

console.log('🛡️ Vigilance Command System Ready');
console.log('🔴 Threat Detection Active');
console.log('📡 All Systems Operational');
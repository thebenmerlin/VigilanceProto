class VigilanceCommand {
    constructor() {
        // Initialize system data
        this.threats = [];
        this.sensors = [
            {"id": "drone_01", "name": "DRONE_01", "type": "drone", "status": "active", "location": [34.0522, -118.2437], "batteryLevel": 85, "signalStrength": 95, "lastPing": Date.now()},
            {"id": "drone_23", "name": "DRONE_23", "type": "drone", "status": "active", "location": [34.1021, -118.1234], "batteryLevel": 72, "signalStrength": 88, "lastPing": Date.now()},
            {"id": "radar_07", "name": "RADAR_07", "type": "radar", "status": "active", "location": [34.0892, -118.3012], "batteryLevel": 100, "signalStrength": 92, "lastPing": Date.now()},
            {"id": "radar_12", "name": "RADAR_12", "type": "radar", "status": "warning", "location": [34.1156, -118.2789], "batteryLevel": 45, "signalStrength": 67, "lastPing": Date.now()},
            {"id": "sensor_45", "name": "SENSOR_45", "type": "motion", "status": "active", "location": [34.0745, -118.2456], "batteryLevel": 90, "signalStrength": 85, "lastPing": Date.now()},
            {"id": "cam_18", "name": "CAM_18", "type": "camera", "status": "critical", "location": [34.0967, -118.2123], "batteryLevel": 15, "signalStrength": 23, "lastPing": Date.now()}
        ];
        
        this.threatTypes = [
            "Unauthorized Vehicle",
            "Perimeter Breach", 
            "Suspicious Activity",
            "Unknown Aircraft",
            "Cyber Intrusion",
            "Equipment Malfunction",
            "False Positive",
            "Personnel Alert"
        ];
        
        this.severityLevels = ["benign", "suspicious", "critical"];
        this.locationBounds = {
            north: 34.15,
            south: 34.00,
            east: -118.10,
            west: -118.35
        };
        
        // System state
        this.isGeneratingThreats = true;
        this.selectedThreat = null;
        this.threatIdCounter = 1;
        this.threatMarkers = new Map();
        this.sensorMarkers = new Map();
        this.showingSensors = false;
        this.currentPage = 'overview';
        this.charts = {};
        this.currentFilter = 'all';
        this.sortColumn = 'timestamp';
        this.sortDirection = 'desc';
        
        // Analytics data
        this.analyticsData = {
            kpis: {
                totalThreats: 127,
                criticalPercentage: 18,
                averageResponseTime: 4.2,
                activeSensors: 24
            },
            threatsByType: {
                "Unauthorized Vehicle": 32,
                "Perimeter Breach": 28,
                "Suspicious Activity": 41,
                "Unknown Aircraft": 15,
                "Cyber Intrusion": 8
            },
            severityDistribution: {
                benign: 65,
                suspicious: 42,
                critical: 20
            }
        };
        
        // Initialize system
        this.init();
    }
    
    init() {
        this.initializeMap();
        this.initializeEventHandlers();
        this.startSystemClock();
        this.loadSampleThreats();
        this.startThreatGeneration();
        this.updateAnalytics();
        this.renderSensorStatus();
        this.initializePages();
    }
    
    initializeMap() {
        // Initialize main dashboard map with CartoDB Dark Matter tiles
        this.map = L.map('map', {
            center: [34.0892, -118.2000],
            zoom: 12,
            zoomControl: false
        });
        
        // Add zoom control to bottom right
        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);
        
        // Use CartoDB Dark Matter tiles as specified
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 18
        }).addTo(this.map);
        
        // Custom threat marker icons
        this.threatIcons = {
            critical: L.divIcon({
                className: 'threat-marker critical',
                html: '<div class="marker-pulse critical"></div><div class="marker-center">⚠</div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }),
            suspicious: L.divIcon({
                className: 'threat-marker suspicious',
                html: '<div class="marker-pulse suspicious"></div><div class="marker-center">⚡</div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }),
            benign: L.divIcon({
                className: 'threat-marker benign',
                html: '<div class="marker-pulse benign"></div><div class="marker-center">ℹ</div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        };
    }
    
    initializeEventHandlers() {
        // Navigation handlers
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(e.target.closest('.nav-link'));
            });
        });
        
        // Dashboard feed controls
        const pauseFeed = document.getElementById('pauseFeed');
        const clearFeed = document.getElementById('clearFeed');
        const showThreats = document.getElementById('showThreats');
        const showSensors = document.getElementById('showSensors');
        
        if (pauseFeed) pauseFeed.addEventListener('click', () => this.toggleThreatGeneration());
        if (clearFeed) clearFeed.addEventListener('click', () => this.clearEventFeed());
        if (showThreats) showThreats.addEventListener('click', () => this.showThreats());
        if (showSensors) showSensors.addEventListener('click', () => this.showSensors());
        
        // Modal handlers
        const closeModalBtn = document.getElementById('closeModal');
        const approveBtn = document.getElementById('approveBtn');
        const rejectBtn = document.getElementById('rejectBtn');
        const falseAlarmBtn = document.getElementById('falseAlarmBtn');
        
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeModal());
        if (approveBtn) approveBtn.addEventListener('click', () => this.handleThreatAction('approved'));
        if (rejectBtn) rejectBtn.addEventListener('click', () => this.handleThreatAction('rejected'));
        if (falseAlarmBtn) falseAlarmBtn.addEventListener('click', () => this.handleThreatAction('false_alarm'));
        
        // Close modal on overlay click
        const modalOverlay = document.getElementById('threatModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeModal();
                }
            });
        }
        
        // Page-specific handlers
        this.initializeThreatsPageHandlers();
        this.initializeAnalyticsPageHandlers();
        this.initializeSensorsPageHandlers();
        this.initializeReportsPageHandlers();
    }
    
    initializeThreatsPageHandlers() {
        // Filter buttons for threats page
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-filter') && this.currentPage === 'threats') {
                this.handleThreatFilter(e.target.dataset.filter);
            }
        });
        
        // Search input
        const threatSearch = document.getElementById('threatSearch');
        if (threatSearch) {
            threatSearch.addEventListener('input', (e) => {
                this.handleThreatSearch(e.target.value);
            });
        }
        
        // Table sorting
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sortable')) {
                this.handleTableSort(e.target.dataset.sort);
            }
        });
    }
    
    initializeAnalyticsPageHandlers() {
        // Time range selector
        const timeRange = document.getElementById('timeRange');
        if (timeRange) {
            timeRange.addEventListener('change', (e) => {
                this.handleTimeRangeChange(e.target.value);
            });
        }
        
        // Export analytics
        const exportAnalytics = document.getElementById('exportAnalytics');
        if (exportAnalytics) {
            exportAnalytics.addEventListener('click', () => {
                this.exportAnalyticsData();
            });
        }
    }
    
    initializeSensorsPageHandlers() {
        // Sensor filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-filter') && this.currentPage === 'sensors') {
                this.handleSensorFilter(e.target.dataset.filter);
            }
        });
    }
    
    initializeReportsPageHandlers() {
        // Date inputs
        const dateFrom = document.getElementById('reportDateFrom');
        const dateTo = document.getElementById('reportDateTo');
        
        if (dateFrom && dateTo) {
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateFrom.value = weekAgo;
            dateTo.value = today;
        }
        
        // Export buttons
        const exportCSV = document.getElementById('exportCSV');
        const exportJSON = document.getElementById('exportJSON');
        const exportSummary = document.getElementById('exportSummary');
        const generateReport = document.getElementById('generateReport');
        
        if (exportCSV) exportCSV.addEventListener('click', () => this.exportData('csv'));
        if (exportJSON) exportJSON.addEventListener('click', () => this.exportData('json'));
        if (exportSummary) exportSummary.addEventListener('click', () => this.exportData('summary'));
        if (generateReport) generateReport.addEventListener('click', () => this.generateReport());
    }
    
    initializePages() {
        // Initialize specific page content
        this.renderThreatsTable();
        this.renderSensorsGrid();
        this.renderReportsSummary();
        this.updateKPICards();
    }
    
    startSystemClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: false,
                timeZone: 'UTC'
            }) + ' UTC';
            const timeElement = document.getElementById('systemTime');
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    loadSampleThreats() {
        const sampleThreats = [
            {
                id: 1,
                timestamp: Date.now() - 300000,
                sensor: "DRONE_01",
                type: "Unauthorized Vehicle",
                severity: "critical",
                confidence: 0.92,
                location: {lat: 34.0522, lng: -118.2437},
                status: "pending",
                details: "Unregistered vehicle detected in restricted zone Alpha-7"
            },
            {
                id: 2,
                timestamp: Date.now() - 240000,
                sensor: "RADAR_07", 
                type: "Perimeter Breach",
                severity: "suspicious",
                confidence: 0.78,
                location: {lat: 34.1021, lng: -118.1234},
                status: "pending",
                details: "Motion detected at north perimeter fence"
            },
            {
                id: 3,
                timestamp: Date.now() - 180000,
                sensor: "CAM_18",
                type: "Suspicious Activity",
                severity: "benign",
                confidence: 0.65,
                location: {lat: 34.0892, lng: -118.3012},
                status: "pending", 
                details: "Individual loitering near main entrance"
            }
        ];
        
        sampleThreats.forEach(threat => {
            this.threats.unshift(threat);
            this.addThreatToFeed(threat, false);
            this.addThreatToMap(threat);
        });
        
        this.threatIdCounter = 4;
    }
    
    startThreatGeneration() {
        const generateThreat = () => {
            if (!this.isGeneratingThreats) return;
            
            const threat = this.generateRandomThreat();
            this.threats.unshift(threat);
            this.addThreatToFeed(threat, true);
            this.addThreatToMap(threat);
            this.updateAnalytics();
            this.renderThreatsTable();
            
            // Limit feed to 50 items
            if (this.threats.length > 50) {
                const removedThreat = this.threats.pop();
                this.removeThreatFromFeed();
                this.removeThreatFromMap(removedThreat.id);
            }
        };
        
        // Generate first threat after 2 seconds
        setTimeout(() => {
            generateThreat();
            
            // Continue generating threats at random intervals
            const scheduleNext = () => {
                const delay = Math.random() * 5000 + 3000; // 3-8 seconds
                setTimeout(() => {
                    generateThreat();
                    scheduleNext();
                }, delay);
            };
            
            scheduleNext();
        }, 2000);
    }
    
    generateRandomThreat() {
        const sensorNames = this.sensors.map(s => s.name);
        const threat = {
            id: this.threatIdCounter++,
            timestamp: Date.now(),
            sensor: sensorNames[Math.floor(Math.random() * sensorNames.length)],
            type: this.threatTypes[Math.floor(Math.random() * this.threatTypes.length)],
            severity: this.severityLevels[Math.floor(Math.random() * this.severityLevels.length)],
            confidence: Math.random() * 0.4 + 0.6, // 0.6 - 1.0
            location: {
                lat: Math.random() * (this.locationBounds.north - this.locationBounds.south) + this.locationBounds.south,
                lng: Math.random() * (this.locationBounds.east - this.locationBounds.west) + this.locationBounds.west
            },
            status: 'pending',
            details: this.generateThreatDetails()
        };
        
        return threat;
    }
    
    generateThreatDetails() {
        const details = [
            "Anomalous pattern detected in sector",
            "Unauthorized access attempt identified",
            "Signal interference detected",
            "Movement pattern analysis indicates threat",
            "Biometric scan mismatch detected",
            "Thermal signature anomaly observed",
            "Network intrusion attempt blocked",
            "Perimeter sensor activation recorded"
        ];
        
        return details[Math.floor(Math.random() * details.length)];
    }
    
    addThreatToFeed(threat, isNew = false) {
        const feed = document.getElementById('eventFeed');
        if (!feed) return;
        
        const eventElement = this.createEventElement(threat, isNew);
        
        if (feed.firstChild) {
            feed.insertBefore(eventElement, feed.firstChild);
        } else {
            feed.appendChild(eventElement);
        }
    }
    
    createEventElement(threat, isNew = false) {
        const div = document.createElement('div');
        div.className = `event-item ${threat.severity}${isNew ? ' new' : ''}`;
        div.dataset.threatId = threat.id;
        
        const timestamp = new Date(threat.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const confidencePercent = Math.round(threat.confidence * 100);
        
        div.innerHTML = `
            <div class="event-header">
                <span class="event-severity ${threat.severity}">${threat.severity}</span>
                <span class="event-timestamp">${timestamp}</span>
            </div>
            <div class="event-details">
                <div class="event-sensor">${threat.sensor}</div>
                <div class="event-type">${threat.type}</div>
                <div class="event-description">${threat.details}</div>
            </div>
            <div class="event-footer">
                <div class="confidence-bar">
                    <span>Confidence:</span>
                    <div class="confidence-progress">
                        <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                    </div>
                    <span>${confidencePercent}%</span>
                </div>
                <div class="event-actions">
                    <button class="btn-event approve" data-action="approve" data-threat-id="${threat.id}">✓</button>
                    <button class="btn-event reject" data-action="reject" data-threat-id="${threat.id}">✕</button>
                    <button class="btn-event false-alarm" data-action="false-alarm" data-threat-id="${threat.id}">⚠</button>
                </div>
            </div>
        `;
        
        // Add click handler for modal
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-event') && !e.target.closest('.btn-event')) {
                this.openThreatModal(threat);
            }
        });
        
        // Add action button handlers
        div.querySelectorAll('.btn-event').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.target.dataset.action;
                const threatId = parseInt(e.target.dataset.threatId);
                this.handleQuickAction(threatId, action);
            });
        });
        
        return div;
    }
    
    addThreatToMap(threat) {
        const marker = L.marker(
            [threat.location.lat, threat.location.lng],
            { icon: this.threatIcons[threat.severity] }
        ).addTo(this.map);
        
        marker.bindPopup(`
            <div style="color: #000; font-family: 'Inter', sans-serif;">
                <strong>${threat.type}</strong><br>
                <span style="color: #666;">Sensor: ${threat.sensor}</span><br>
                <span style="color: #666;">Confidence: ${Math.round(threat.confidence * 100)}%</span><br>
                <span style="color: #666;">${new Date(threat.timestamp).toLocaleTimeString()}</span>
            </div>
        `);
        
        marker.on('click', () => {
            this.openThreatModal(threat);
        });
        
        this.threatMarkers.set(threat.id, marker);
        
        if (!this.showingSensors) {
            this.hideSensorMarkers();
        }
    }
    
    removeThreatFromMap(threatId) {
        const marker = this.threatMarkers.get(threatId);
        if (marker) {
            this.map.removeLayer(marker);
            this.threatMarkers.delete(threatId);
        }
    }
    
    removeThreatFromFeed() {
        const feed = document.getElementById('eventFeed');
        if (feed && feed.lastChild) {
            feed.removeChild(feed.lastChild);
        }
    }
    
    showThreats() {
        this.showingSensors = false;
        const threatsBtn = document.getElementById('showThreats');
        const sensorsBtn = document.getElementById('showSensors');
        
        if (threatsBtn) threatsBtn.classList.add('active');
        if (sensorsBtn) sensorsBtn.classList.remove('active');
        
        this.hideSensorMarkers();
        this.showThreatMarkers();
    }
    
    showSensors() {
        this.showingSensors = true;
        const sensorsBtn = document.getElementById('showSensors');
        const threatsBtn = document.getElementById('showThreats');
        
        if (sensorsBtn) sensorsBtn.classList.add('active');
        if (threatsBtn) threatsBtn.classList.remove('active');
        
        this.hideThreatMarkers();
        this.showSensorMarkers();
    }
    
    showThreatMarkers() {
        this.threatMarkers.forEach(marker => {
            marker.addTo(this.map);
        });
    }
    
    hideThreatMarkers() {
        this.threatMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
    }
    
    showSensorMarkers() {
        this.sensors.forEach(sensor => {
            if (!this.sensorMarkers.has(sensor.id)) {
                const color = sensor.status === 'active' ? '#00FF94' : 
                             sensor.status === 'warning' ? '#FFC14D' : '#FF4D4D';
                             
                const marker = L.circleMarker(sensor.location, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.3,
                    radius: 8
                }).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="color: #000; font-family: 'Inter', sans-serif;">
                        <strong>${sensor.name}</strong><br>
                        <span style="color: #666;">Status: ${sensor.status.toUpperCase()}</span><br>
                        <span style="color: #666;">Type: ${sensor.type.toUpperCase()}</span><br>
                        <span style="color: #666;">Battery: ${sensor.batteryLevel}%</span>
                    </div>
                `);
                
                this.sensorMarkers.set(sensor.id, marker);
            } else {
                this.sensorMarkers.get(sensor.id).addTo(this.map);
            }
        });
    }
    
    hideSensorMarkers() {
        this.sensorMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
    }
    
    handleNavigation(link) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        const navItem = link.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // Hide all page content
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const panel = link.dataset.panel;
        const pageElement = document.getElementById(`${panel}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
            this.currentPage = panel;
            
            // Page-specific initialization
            if (panel === 'analytics' && !this.charts.initialized) {
                setTimeout(() => this.initializeCharts(), 200);
            } else if (panel === 'threats') {
                setTimeout(() => this.initializeThreatsMap(), 100);
            } else if (panel === 'sensors') {
                setTimeout(() => this.initializeSensorsMap(), 100);
            }
        }
        
        // Trigger page transitions
        this.handlePageTransition(panel);
    }
    
    handlePageTransition(panel) {
        // Add smooth transition effect
        const content = document.querySelector('.content-area');
        if (content) {
            content.style.opacity = '0.7';
            setTimeout(() => {
                content.style.opacity = '1';
            }, 150);
        }
    }
    
    initializeThreatsMap() {
        const mapElement = document.getElementById('threatsMap');
        if (mapElement && !this.threatsMap) {
            this.threatsMap = L.map('threatsMap', {
                center: [34.0892, -118.2000],
                zoom: 12
            });
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 18
            }).addTo(this.threatsMap);
            
            // Add threat markers to threats page map
            this.threats.forEach(threat => {
                L.marker([threat.location.lat, threat.location.lng], 
                    { icon: this.threatIcons[threat.severity] }).addTo(this.threatsMap);
            });
        }
        if (this.threatsMap) {
            setTimeout(() => this.threatsMap.invalidateSize(), 100);
        }
    }
    
    initializeSensorsMap() {
        const mapElement = document.getElementById('sensorsMap');
        if (mapElement && !this.sensorsMap) {
            this.sensorsMap = L.map('sensorsMap', {
                center: [34.0892, -118.2000],
                zoom: 12
            });
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 18
            }).addTo(this.sensorsMap);
            
            // Add sensor markers
            this.sensors.forEach(sensor => {
                const color = sensor.status === 'active' ? '#00FF94' : 
                             sensor.status === 'warning' ? '#FFC14D' : '#FF4D4D';
                
                L.circleMarker(sensor.location, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5,
                    radius: 10
                }).addTo(this.sensorsMap)
                  .bindPopup(`<div style="color: #000;"><strong>${sensor.name}</strong><br>Status: ${sensor.status}</div>`);
            });
        }
        if (this.sensorsMap) {
            setTimeout(() => this.sensorsMap.invalidateSize(), 100);
        }
    }
    
    initializeCharts() {
        this.charts.initialized = true;
        
        // Threats by Type Chart
        const typeCtx = document.getElementById('threatsTypeChart');
        if (typeCtx) {
            this.charts.typeChart = new Chart(typeCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(this.analyticsData.threatsByType),
                    datasets: [{
                        label: 'Threats',
                        data: Object.values(this.analyticsData.threatsByType),
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#2C2F36' }, ticks: { color: '#A0A6B1' } },
                        x: { grid: { color: '#2C2F36' }, ticks: { color: '#A0A6B1' } }
                    }
                }
            });
        }
        
        // Threats Over Time Chart
        const timeCtx = document.getElementById('threatsTimeChart');
        if (timeCtx) {
            const timeLabels = [];
            const timeData = [];
            for (let i = 23; i >= 0; i--) {
                const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
                timeLabels.push(`${hour}:00`);
                timeData.push(Math.floor(Math.random() * 20) + 5);
            }
            
            this.charts.timeChart = new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: 'Threats',
                        data: timeData,
                        borderColor: '#1FB8CD',
                        backgroundColor: 'rgba(31, 184, 205, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#2C2F36' }, ticks: { color: '#A0A6B1' } },
                        x: { grid: { color: '#2C2F36' }, ticks: { color: '#A0A6B1' } }
                    }
                }
            });
        }
        
        // Severity Distribution Chart
        const severityCtx = document.getElementById('severityChart');
        if (severityCtx) {
            this.charts.severityChart = new Chart(severityCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Benign', 'Suspicious', 'Critical'],
                    datasets: [{
                        data: Object.values(this.analyticsData.severityDistribution),
                        backgroundColor: ['#00FF94', '#FFC14D', '#FF4D4D']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#A0A6B1' }
                        }
                    }
                }
            });
        }
    }
    
    updateKPICards() {
        const kpiTotalThreats = document.getElementById('kpiTotalThreats');
        const kpiCriticalPercent = document.getElementById('kpiCriticalPercent');
        const kpiResponseTime = document.getElementById('kpiResponseTime');
        const kpiActiveSensors = document.getElementById('kpiActiveSensors');
        
        if (kpiTotalThreats) kpiTotalThreats.textContent = this.analyticsData.kpis.totalThreats;
        if (kpiCriticalPercent) kpiCriticalPercent.textContent = this.analyticsData.kpis.criticalPercentage + '%';
        if (kpiResponseTime) kpiResponseTime.textContent = this.analyticsData.kpis.averageResponseTime + 's';
        if (kpiActiveSensors) kpiActiveSensors.textContent = this.analyticsData.kpis.activeSensors;
    }
    
    renderThreatsTable() {
        const tableBody = document.getElementById('threatsTableBody');
        const threatCount = document.getElementById('threatCount');
        
        if (!tableBody) return;
        
        let filteredThreats = this.threats;
        if (this.currentFilter !== 'all') {
            filteredThreats = this.threats.filter(t => t.severity === this.currentFilter);
        }
        
        // Sort threats
        filteredThreats.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            if (this.sortColumn === 'timestamp') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        tableBody.innerHTML = '';
        if (threatCount) threatCount.textContent = filteredThreats.length;
        
        filteredThreats.forEach(threat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(threat.timestamp).toLocaleString()}</td>
                <td>${threat.sensor}</td>
                <td>${threat.type}</td>
                <td><span class="event-severity ${threat.severity}">${threat.severity}</span></td>
                <td>${Math.round(threat.confidence * 100)}%</td>
                <td><span class="threat-status ${threat.status}">${threat.status}</span></td>
                <td>
                    <button class="btn-event approve" data-threat-id="${threat.id}">✓</button>
                    <button class="btn-event reject" data-threat-id="${threat.id}">✕</button>
                </td>
            `;
            
            row.addEventListener('click', () => this.openThreatModal(threat));
            
            // Add action handlers to table buttons
            row.querySelectorAll('.btn-event').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.classList.contains('approve') ? 'approve' : 'reject';
                    const threatId = parseInt(btn.dataset.threatId);
                    this.handleQuickAction(threatId, action);
                });
            });
            
            tableBody.appendChild(row);
        });
    }
    
    renderSensorsGrid() {
        const sensorsGrid = document.getElementById('sensorsGrid');
        if (!sensorsGrid) return;
        
        sensorsGrid.innerHTML = '';
        
        this.sensors.forEach(sensor => {
            const card = document.createElement('div');
            card.className = 'sensor-card';
            card.innerHTML = `
                <div class="sensor-card-header">
                    <div class="sensor-id">${sensor.name}</div>
                    <div class="sensor-type">${sensor.type}</div>
                </div>
                <div class="sensor-card-body">
                    <div class="sensor-metric">
                        <div class="sensor-metric-label">Battery</div>
                        <div class="sensor-metric-value">${sensor.batteryLevel}%</div>
                        <div class="battery-indicator">
                            <div class="battery-fill ${this.getBatteryClass(sensor.batteryLevel)}" 
                                 style="width: ${sensor.batteryLevel}%"></div>
                        </div>
                    </div>
                    <div class="sensor-metric">
                        <div class="sensor-metric-label">Signal</div>
                        <div class="sensor-metric-value">${sensor.signalStrength}%</div>
                    </div>
                    <div class="sensor-metric">
                        <div class="sensor-metric-label">Status</div>
                        <div class="sensor-metric-value">
                            <span class="sensor-status ${sensor.status}"></span>
                            ${sensor.status.toUpperCase()}
                        </div>
                    </div>
                    <div class="sensor-metric">
                        <div class="sensor-metric-label">Last Ping</div>
                        <div class="sensor-metric-value">${this.formatLastPing(sensor.lastPing)}</div>
                    </div>
                </div>
            `;
            
            sensorsGrid.appendChild(card);
        });
    }
    
    renderReportsSummary() {
        const reportSummary = document.getElementById('reportSummary');
        if (!reportSummary) return;
        
        const summaryData = [
            { label: 'Total Events', value: this.threats.length },
            { label: 'Critical Threats', value: this.threats.filter(t => t.severity === 'critical').length },
            { label: 'Resolved Events', value: this.threats.filter(t => t.status !== 'pending').length },
            { label: 'Active Sensors', value: this.sensors.filter(s => s.status === 'active').length },
            { label: 'System Uptime', value: '99.97%' },
            { label: 'Average Response Time', value: '4.2s' }
        ];
        
        reportSummary.innerHTML = summaryData.map(item => `
            <div class="summary-item">
                <div class="summary-label">${item.label}</div>
                <div class="summary-value">${item.value}</div>
            </div>
        `).join('');
    }
    
    getBatteryClass(level) {
        if (level > 60) return 'high';
        if (level > 30) return 'medium';
        return 'low';
    }
    
    formatLastPing(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? 'Now' : `${minutes}m ago`;
    }
    
    handleThreatFilter(filter) {
        this.currentFilter = filter;
        
        // Update filter button states for threats page
        document.querySelectorAll('#threats-page .btn-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#threats-page [data-filter="${filter}"]`).classList.add('active');
        
        this.renderThreatsTable();
    }
    
    handleSensorFilter(filter) {
        // Update filter button states for sensors page
        document.querySelectorAll('#sensors-page .btn-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#sensors-page [data-filter="${filter}"]`).classList.add('active');
        
        // Filter sensors and re-render
        this.renderSensorsGrid();
    }
    
    handleThreatSearch(query) {
        // Implementation for threat search
        this.renderThreatsTable();
    }
    
    handleTableSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'desc';
        }
        this.renderThreatsTable();
    }
    
    handleTimeRangeChange(range) {
        console.log('Time range changed:', range);
        // Update charts based on time range
    }
    
    exportAnalyticsData() {
        const data = {
            timestamp: new Date().toISOString(),
            kpis: this.analyticsData.kpis,
            threatsByType: this.analyticsData.threatsByType,
            severityDistribution: this.analyticsData.severityDistribution
        };
        this.downloadJSON(data, 'analytics-export.json');
    }
    
    exportData(format) {
        const data = {
            threats: this.threats,
            sensors: this.sensors,
            exportDate: new Date().toISOString()
        };
        
        if (format === 'csv') {
            this.downloadCSV(this.threats, 'threat-logs.csv');
        } else if (format === 'json') {
            this.downloadJSON(data, 'system-data.json');
        } else if (format === 'summary') {
            this.downloadSummaryReport();
        }
    }
    
    generateReport() {
        // Generate comprehensive report
        this.renderReportsSummary();
    }
    
    downloadCSV(data, filename) {
        const csvContent = this.convertToCSV(data);
        this.downloadFile(csvContent, filename, 'text/csv');
    }
    
    downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }
    
    downloadSummaryReport() {
        const summaryHTML = this.generateSummaryHTML();
        this.downloadFile(summaryHTML, 'summary-report.html', 'text/html');
    }
    
    convertToCSV(threats) {
        const headers = ['ID', 'Timestamp', 'Sensor', 'Type', 'Severity', 'Confidence', 'Status'];
        const rows = threats.map(t => [
            t.id, 
            new Date(t.timestamp).toISOString(), 
            t.sensor, 
            t.type, 
            t.severity, 
            Math.round(t.confidence * 100) + '%', 
            t.status
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    generateSummaryHTML() {
        return `
            <!DOCTYPE html>
            <html>
            <head><title>Vigilance Command - Summary Report</title></head>
            <body>
                <h1>System Summary Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <h2>Statistics</h2>
                <ul>
                    <li>Total Threats: ${this.threats.length}</li>
                    <li>Critical Threats: ${this.threats.filter(t => t.severity === 'critical').length}</li>
                    <li>Active Sensors: ${this.sensors.filter(s => s.status === 'active').length}</li>
                </ul>
            </body>
            </html>
        `;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    openThreatModal(threat) {
        this.selectedThreat = threat;
        const modal = document.getElementById('threatModal');
        const content = document.getElementById('modalContent');
        
        if (!modal || !content) return;
        
        const timestamp = new Date(threat.timestamp).toLocaleString();
        const confidencePercent = Math.round(threat.confidence * 100);
        
        content.innerHTML = `
            <div style="display: grid; gap: 16px;">
                <div>
                    <h4 style="color: #4A9EFF; margin-bottom: 8px;">Threat Classification</h4>
                    <div style="display: flex; gap: 16px; align-items: center;">
                        <span class="event-severity ${threat.severity}">${threat.severity.toUpperCase()}</span>
                        <span style="color: #A0A6B1;">ID: ${threat.id}</span>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #4A9EFF; margin-bottom: 8px;">Detection Details</h4>
                    <div style="font-family: 'Monaco', monospace; font-size: 13px; color: #A0A6B1;">
                        <div>Type: ${threat.type}</div>
                        <div>Sensor: ${threat.sensor}</div>
                        <div>Timestamp: ${timestamp}</div>
                        <div>Confidence: ${confidencePercent}%</div>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #4A9EFF; margin-bottom: 8px;">Location</h4>
                    <div style="font-family: 'Monaco', monospace; font-size: 13px; color: #A0A6B1;">
                        <div>Latitude: ${threat.location.lat.toFixed(6)}°</div>
                        <div>Longitude: ${threat.location.lng.toFixed(6)}°</div>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #4A9EFF; margin-bottom: 8px;">Description</h4>
                    <p style="color: #A0A6B1; line-height: 1.5;">${threat.details}</p>
                </div>
                
                <div>
                    <h4 style="color: #4A9EFF; margin-bottom: 8px;">Status</h4>
                    <span style="text-transform: uppercase; color: #FFC14D; font-weight: 600;">${threat.status}</span>
                </div>
            </div>
        `;
        
        modal.classList.add('visible');
    }
    
    closeModal() {
        const modal = document.getElementById('threatModal');
        if (modal) {
            modal.classList.remove('visible');
        }
        this.selectedThreat = null;
    }
    
    handleThreatAction(action) {
        if (!this.selectedThreat) return;
        
        this.selectedThreat.status = action;
        this.updateThreatInFeed(this.selectedThreat);
        this.closeModal();
        this.updateAnalytics();
        this.renderThreatsTable();
        this.showActionConfirmation(action);
    }
    
    handleQuickAction(threatId, action) {
        const threat = this.threats.find(t => t.id === threatId);
        if (threat) {
            const actionMap = {
                'approve': 'approved',
                'reject': 'rejected',
                'false-alarm': 'false_alarm'
            };
            
            threat.status = actionMap[action] || action;
            this.updateThreatInFeed(threat);
            this.updateAnalytics();
            this.renderThreatsTable();
            this.showActionConfirmation(threat.status);
        }
    }
    
    showActionConfirmation(action) {
        const actionText = action.replace('_', ' ').toUpperCase();
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #1A1D24;
            color: #00FF94;
            padding: 12px 20px;
            border-radius: 4px;
            border: 1px solid #00FF94;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            z-index: 3000;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        notification.textContent = `Threat ${actionText}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    updateThreatInFeed(threat) {
        const element = document.querySelector(`[data-threat-id="${threat.id}"]`);
        if (element) {
            const statusColors = {
                approved: '#00FF94',
                rejected: '#FF4D4D',
                false_alarm: '#FFC14D'
            };
            
            const color = statusColors[threat.status];
            if (color) {
                element.style.borderLeftColor = color;
                element.style.opacity = '0.7';
            }
        }
    }
    
    updateAnalytics() {
        const totalThreats = this.threats.length;
        const criticalCount = this.threats.filter(t => t.severity === 'critical').length;
        const suspiciousCount = this.threats.filter(t => t.severity === 'suspicious').length;
        const benignCount = this.threats.filter(t => t.severity === 'benign').length;
        const activeSensors = this.sensors.filter(s => s.status === 'active').length;
        
        const totalElement = document.getElementById('totalThreats');
        const sensorsElement = document.getElementById('activeSensors');
        const criticalElement = document.getElementById('criticalCount');
        const suspiciousElement = document.getElementById('suspiciousCount');
        const benignElement = document.getElementById('benignCount');
        
        if (totalElement) totalElement.textContent = totalThreats;
        if (sensorsElement) sensorsElement.textContent = activeSensors;
        if (criticalElement) criticalElement.textContent = criticalCount;
        if (suspiciousElement) suspiciousElement.textContent = suspiciousCount;
        if (benignElement) benignElement.textContent = benignCount;
        
        // Update distribution bars
        const maxCount = Math.max(criticalCount, suspiciousCount, benignCount, 1);
        const criticalBar = document.querySelector('.bar-critical');
        const suspiciousBar = document.querySelector('.bar-suspicious');
        const benignBar = document.querySelector('.bar-benign');
        
        if (criticalBar) criticalBar.style.width = `${(criticalCount / maxCount) * 100}%`;
        if (suspiciousBar) suspiciousBar.style.width = `${(suspiciousCount / maxCount) * 100}%`;
        if (benignBar) benignBar.style.width = `${(benignCount / maxCount) * 100}%`;
    }
    
    renderSensorStatus() {
        const sensorList = document.getElementById('sensorList');
        if (!sensorList) return;
        
        sensorList.innerHTML = '';
        
        this.sensors.forEach(sensor => {
            const item = document.createElement('div');
            item.className = 'sensor-item';
            item.innerHTML = `
                <span class="sensor-name">${sensor.name}</span>
                <div class="sensor-status ${sensor.status}"></div>
            `;
            sensorList.appendChild(item);
        });
    }
    
    toggleThreatGeneration() {
        this.isGeneratingThreats = !this.isGeneratingThreats;
        const btn = document.getElementById('pauseFeed');
        if (btn) {
            btn.textContent = this.isGeneratingThreats ? '⏸' : '▶';
        }
    }
    
    clearEventFeed() {
        if (confirm('Clear all events from feed? This cannot be undone.')) {
            this.threats = [];
            const feed = document.getElementById('eventFeed');
            if (feed) feed.innerHTML = '';
            
            this.threatMarkers.forEach(marker => this.map.removeLayer(marker));
            this.threatMarkers.clear();
            this.updateAnalytics();
            this.renderThreatsTable();
        }
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Vigilance Command System...');
    window.vigilanceCommand = new VigilanceCommand();
});

// Handle window resize for maps
window.addEventListener('resize', () => {
    if (window.vigilanceCommand) {
        if (window.vigilanceCommand.map) {
            setTimeout(() => window.vigilanceCommand.map.invalidateSize(), 100);
        }
        if (window.vigilanceCommand.threatsMap) {
            setTimeout(() => window.vigilanceCommand.threatsMap.invalidateSize(), 100);
        }
        if (window.vigilanceCommand.sensorsMap) {
            setTimeout(() => window.vigilanceCommand.sensorsMap.invalidateSize(), 100);
        }
    }
});

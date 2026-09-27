document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    let mapInitialized = false;

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(l => l.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-target');
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === targetId) {
                    view.classList.add('active');
                }
            });

            if (targetId === 'exploration') {
                if (!mapInitialized) {
                    setTimeout(initMap, 100);
                    mapInitialized = true;
                } else {
                    setTimeout(() => mapInstance.invalidateSize(), 100);
                }
            }
            if (targetId === 'overview' || targetId === 'global-heatmap' || targetId === 'jarvis-ai') {
                setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
            }
        });
    });

    // --- 2. Chart.js (Overview) ---
    function initOverviewCharts() {
        const ctx = document.getElementById('productionChart');
        if (ctx) {
            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                        {
                            label: 'Actual Yield',
                            data: [1350, 1200, 1100, 1050, 1300, 1250, 1350],
                            borderColor: '#007BFF',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#007BFF',
                        },
                        {
                            label: 'Company Target',
                            data: [1400, 1400, 1400, 1400, 1400, 1400, 1400],
                            borderColor: '#CBD5E1',
                            borderDash: [5, 5],
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#6B7280' } },
                        y: { grid: { color: '#F1F5F9' }, ticks: { color: '#6B7280' } }
                    }
                }
            });
        }

        const radarDom = document.getElementById('radarChart');
        if (radarDom) {
            const radarChart = echarts.init(radarDom);
            const option = {
                backgroundColor: 'transparent',
                radar: {
                    indicator: [
                        { name: 'Yield', max: 100 },
                        { name: 'Purity', max: 100 },
                        { name: 'Logistics', max: 100 },
                        { name: 'AI Pred.', max: 100 },
                        { name: 'Safety', max: 100 }
                    ],
                    axisName: { color: '#6B7280', fontSize: 12 },
                    splitArea: { show: false },
                    axisLine: { lineStyle: { color: '#E2E8F0' } },
                    splitLine: { lineStyle: { color: '#E2E8F0' } }
                },
                series: [{
                    type: 'radar',
                    data: [{
                        value: [85, 92, 75, 95, 99],
                        name: 'Efficiency',
                        itemStyle: { color: '#007BFF' },
                        areaStyle: { color: 'rgba(0, 123, 255, 0.2)' }
                    }]
                }]
            };
            radarChart.setOption(option);
            window.addEventListener('resize', () => radarChart.resize());
        }
    }

    // --- 3. Map (Exploration) ---
    const allZones = [
        { id: 1, lat: -22.345, lng: 119.231, score: 95, priority: 'High', color: '#EF4444', name: 'Pilbara Alpha', desc: 'Massive exposed ridge formation in the Pilbara craton. Topography indicates high-grade surficial manganese oxide accumulation.', reasons: ['Spectral Signature: Positive for Pyrolusite.', 'Aligned with major NW-SE fault line.'] },
        { id: 2, lat: -27.400, lng: 22.900,  score: 88, priority: 'High', color: '#EF4444', name: 'Kalahari Deep', desc: 'Largest continental deposit. Deep subsurface radar indicates massive, unexploited veins.', reasons: ['High density anomaly detected.', 'Proximity to existing shafts.'] },
        { id: 3, lat: -1.500,  lng: 13.200,  score: 92, priority: 'High', color: '#EF4444', name: 'Moanda Core', desc: 'Extremely pure ore body in the Gabon region. Optimal extraction topography.', reasons: ['Optimal extraction topography.', 'High Mn to Fe ratio.'] },
        { id: 4, lat: -19.900, lng: -43.900, score: 75, priority: 'Medium', color: '#F59E0B', name: 'Minas Gerais Basin', desc: 'Sub-basin structure showing secondary manganese enrichment.', reasons: ['Cross-cutting lineaments.', 'Hydrology indicates reserves.'] },
        { id: 5, lat: 48.300,  lng: 33.500,  score: 71, priority: 'Medium', color: '#F59E0B', name: 'Nikopol Deposit', desc: 'Historical basin with remaining mid-grade ores.', reasons: ['Historical basin.', 'Large volume, mid-grade.'] },
        { id: 6, lat: 22.500,  lng: 85.300,  score: 68, priority: 'Medium', color: '#F59E0B', name: 'Keonjhar Tract', desc: 'Forested region deposit. Significant vegetation spectral stress anomaly.', reasons: ['Vegetation spectral stress anomaly.', 'Iron ore co-location.'] },
        { id: 7, lat: 27.800,  lng: 112.900, score: 55, priority: 'Low', color: '#10B981', name: 'Xiangtan Peripheral', desc: 'Edge of known reserves. Mostly low-grade silicates.', reasons: ['Weak surface anomaly.', 'Deep bedrock layers.'] },
        { id: 8, lat: 23.500,  lng: -102.500,score: 45, priority: 'Low', color: '#10B981', name: 'Zacatecas Outskirts', desc: 'Deep subsurface, low grade. Not currently economically viable.', reasons: ['Minor tectonic shift.', 'Low spectral return.'] },
        { id: 9, lat: -20.000, lng: 135.000, score: 38, priority: 'Low', color: '#10B981', name: 'Central Desert Anomaly', desc: 'Scattered nodules. High extraction cost.', reasons: ['Isolated nodule scatter.', 'Harsh logistics.'] }
    ];

    let markersLayer = L.layerGroup();
    let networkLinesLayer = L.layerGroup();
    let mapInstance = null; 
    let currentZone = null;

    function initMap() {
        if(mapInstance) return;
        mapInstance = L.map('map', { zoomControl: false, attributionControl: false }).setView([10.0, 10.0], 2);
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 18
        }).addTo(mapInstance);
        markersLayer.addTo(mapInstance);
        networkLinesLayer.addTo(mapInstance);
        setTimeout(() => mapInstance.invalidateSize(), 200);
    }

    const btnRunScan = document.getElementById('btn-run-scan');
    const terminalLog = document.getElementById('terminal-log');
    const aiScannerOverlay = document.getElementById('ai-scanner');
    const scanControls = document.getElementById('scan-controls');
    const detectedZonesList = document.getElementById('detected-zones-list');
    const zoneListContainer = document.getElementById('zone-list-container');
    const aiPanel = document.getElementById('ai-panel');
    const filterHigh = document.getElementById('filter-high');
    const filterMed = document.getElementById('filter-med');
    const filterLow = document.getElementById('filter-low');

    const logs = [
        "> GLOBAL UPLINK ESTABLISHED...",
        "> CONNECTING TO ISRO PUBLIC API...",
        "> PULLING NASA SATELLITE DEM DATA...",
        "> RUNNING MULTI-SPECTRAL ANALYSIS WORLDWIDE...",
        "> MANGANISI AI: ISOLATING MN-OXIDE SIGNATURES...",
        "> APPLYING TERRAIN ML PROSPECTIVITY MODEL...",
        "> MAPPING GLOBAL SUPPLY NETWORK...",
        "> DEEP SCAN COMPLETE."
    ];

    btnRunScan?.addEventListener('click', () => {
        scanControls.classList.add('hidden');
        terminalLog.classList.remove('hidden');
        aiScannerOverlay.querySelector('h2').textContent = "SCANNING ACTIVE...";
        
        let delay = 0;
        terminalLog.innerHTML = ''; 
        
        logs.forEach((logText) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'log-entry';
                el.textContent = logText;
                terminalLog.appendChild(el);
                terminalLog.scrollTop = terminalLog.scrollHeight;
            }, delay);
            delay += Math.floor(Math.random() * 400) + 200; 
        });

        setTimeout(() => {
            mapInstance.flyTo([10, 20], 2, { duration: 2.0 });
            setTimeout(() => {
                drawZonesAndPopulateList();
                aiScannerOverlay.style.opacity = '0';
                setTimeout(() => {
                    aiScannerOverlay.classList.add('hidden');
                    terminalLog.classList.add('hidden');
                    scanControls.classList.remove('hidden');
                    btnRunScan.textContent = "RE-CALIBRATE SCAN";
                    detectedZonesList.classList.remove('hidden');
                }, 500);
            }, 2000);
        }, delay + 500);
    });

    filterHigh?.addEventListener('change', drawZonesAndPopulateList);
    filterMed?.addEventListener('change', drawZonesAndPopulateList);
    filterLow?.addEventListener('change', drawZonesAndPopulateList);

    function drawZonesAndPopulateList() {
        if(!mapInstance) return;
        markersLayer.clearLayers();
        networkLinesLayer.clearLayers();
        zoneListContainer.innerHTML = '';
        
        const showHigh = filterHigh?.checked;
        const showMed = filterMed?.checked;
        const showLow = filterLow?.checked;

        const filteredZones = allZones.filter(z => {
            if(z.priority === 'High' && showHigh) return true;
            if(z.priority === 'Medium' && showMed) return true;
            if(z.priority === 'Low' && showLow) return true;
            return false;
        });

        const sortedZones = [...filteredZones].sort((a,b) => a.lng - b.lng);
        if (sortedZones.length > 1) {
            const lineCoords = sortedZones.map(z => [z.lat, z.lng]);
            L.polyline(lineCoords, {
                color: '#007BFF', weight: 3, opacity: 0.6, className: 'network-line'
            }).addTo(networkLinesLayer);
        }

        filteredZones.forEach(zone => {
            const marker = L.circleMarker([zone.lat, zone.lng], {
                radius: 8, fillColor: '#fff', color: zone.color, weight: 3, fillOpacity: 1
            }).addTo(markersLayer);

            const clickHandler = () => {
                mapInstance.flyTo([zone.lat, zone.lng], 6, { duration: 1.5 });
                showAIExplanation(zone);
                
                marker.setStyle({ fillColor: zone.color });
                setTimeout(() => marker.setStyle({ fillColor: '#fff' }), 1000);
            };

            marker.on('click', clickHandler);
            marker.on('mouseover', function() { this.setStyle({ radius: 12, fillColor: zone.color }); });
            marker.on('mouseout', function() { this.setStyle({ radius: 8, fillColor: '#fff' }); });
            marker.bindTooltip(`<b>${zone.name}</b><br>Score: ${zone.score}`, { direction: 'top' });
            marker.bindPopup(`
                <div style="font-size:12px; line-height: 1.4; text-align: left; padding: 4px; min-width: 150px;">
                    <b style="color: #007BFF; font-size:13px;">${zone.name}</b><br>
                    <b>Location:</b> ${zone.lat}, ${zone.lng}<br>
                    <a href="https://www.google.com/maps/search/?api=1&query=${zone.lat},${zone.lng}" target="_blank" style="color: #007BFF; text-decoration: underline; font-weight: bold; padding: 4px 0; display: inline-block;">Open in Google Maps ↗</a><br>
                    <b>Score:</b> ${zone.score}
                </div>
            `);

            const listItem = document.createElement('div');
            listItem.className = 'zone-list-item';
            listItem.style.borderLeft = `4px solid ${zone.color}`;
            listItem.innerHTML = `<h4>${zone.name}</h4><p>Score: <span style="color:${zone.color}; font-weight:bold;">${zone.score}</span> | ${zone.priority}</p>`;
            listItem.addEventListener('click', clickHandler);
            zoneListContainer.appendChild(listItem);
        });
    }

    function showAIExplanation(zone) {
        currentZone = zone;
        document.getElementById('panel-empty').classList.add('hidden');
        document.getElementById('ai-panel-content').classList.remove('hidden');

        document.getElementById('zone-name').textContent = zone.name;
        document.getElementById('zone-score').textContent = zone.score;
        document.getElementById('zone-score').style.color = zone.color;
        
        const priorityTag = document.getElementById('zone-priority');
        priorityTag.textContent = `${zone.priority} Priority`;
        priorityTag.style.color = zone.color;
        priorityTag.style.background = `${zone.color}22`;

        document.getElementById('zone-desc').textContent = zone.desc;

        const ul = document.getElementById('zone-reasons');
        ul.innerHTML = '';
        zone.reasons.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            ul.appendChild(li);
        });
        aiPanel.classList.remove('hidden');
    }

    // --- 3D Google Earth & 2D Maps Logic ---
    const btnStreetView = document.getElementById('btn-street-view');
    const btnGoogleMaps = document.getElementById('btn-google-maps');
    
    if(btnStreetView) {
        btnStreetView.addEventListener('click', () => {
            if(!currentZone) return;
            const earthUrl = `https://earth.google.com/web/@${currentZone.lat},${currentZone.lng},1500a,35y,0h,45t,0r`;
            window.open(earthUrl, '_blank');
        });
    }
    
    if(btnGoogleMaps) {
        btnGoogleMaps.addEventListener('click', () => {
            if(!currentZone) return;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentZone.lat},${currentZone.lng}`;
            window.open(mapsUrl, '_blank');
        });
    }

    // --- 5. ECharts-GL: True 3D Google Earth Style Globe Heatmap ---
    function initGlobalHeatmap() {
        const mapDom = document.getElementById('echarts-world-map');
        if (!mapDom) return;
        
        // ECharts GL initialization
        const myChart = echarts.init(mapDom);
        
        // Fix: Use permissive CORS texture URL for file:// rendering
        const earthTexture = 'https://fastly.jsdelivr.net/gh/apache/echarts-website@asf-site/examples/data-gl/asset/world.topo.bathy.200401.jpg';
        
        // Fix: Use proper Array of Objects format for ECharts scatter3D to prevent crashing
        let scatterData = [
            { name: 'Pilbara Operations', value: [119.5, -22.5, 95] },
            { name: 'Kalahari Basin', value: [22.9, -27.4, 90] },
            { name: 'Minas Gerais', value: [-43.9, -19.9, 80] },
            { name: 'Moanda Extraction', value: [13.2, -1.5, 75] },
            { name: 'Xiangtan Hub', value: [112.9, 27.8, 60] }
        ];
        
        const option = {
            backgroundColor: 'transparent',
            tooltip: { 
                trigger: 'item', 
                backgroundColor: 'rgba(255,255,255,0.95)', 
                borderColor: '#e2e8f0', 
                textStyle: { color: '#333' },
                enterable: true,
                formatter: function(params) {
                    let lng = params.value[0];
                    let lat = params.value[1];
                    return `
                        <div style="font-size:12px; line-height: 1.4; text-align: left; padding: 2px;">
                            <b style="color: #A855F7; font-size:13px;">${params.name}</b><br/>
                            <b>Location:</b> ${lat}, ${lng}<br/>
                            <b>Magnesium Heat:</b> ${params.value[3]}%<br/>
                            <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" style="color: #007BFF; text-decoration: underline; font-weight: bold; margin-top: 5px; display: inline-block;">Open in Google Maps ↗</a>
                        </div>
                    `;
                }
            },
            globe: {
                baseTexture: earthTexture,
                displacementScale: 0.04,
                shading: 'lambert',
                environment: 'transparent',
                atmosphere: { show: true, offset: 0.1, color: '#A855F7', glowPower: 0.3, innerGlowPower: 0.6 }, // Purple atmosphere
                light: {
                    main: { intensity: 2.0, shadow: true },
                    ambient: { intensity: 0.5 }
                },
                viewControl: { 
                    autoRotate: true, 
                    autoRotateSpeed: 10, 
                    distance: 170, 
                    alpha: 20
                }
            },
            series: [{
                name: 'Magnesium Deposits',
                type: 'scatter3D',
                coordinateSystem: 'globe',
                blendMode: 'lighter',
                symbolSize: function (val) { return val[3] / 3; }, // Size based on heat
                itemStyle: { color: '#A855F7', opacity: 0.95 }, // Glowing purple
                data: scatterData.map(d => {
                    // Set altitude to 0.02 so they stick to the surface and don't float!
                    return { name: d.name, value: [d.value[0], d.value[1], 0.02, d.value[2]] };
                })
            }]
        };
        myChart.setOption(option);
        
        // Click to open Google Maps directly
        myChart.on('click', function(params) {
            if (params.componentType === 'series') {
                let lng = params.value[0];
                let lat = params.value[1];
                window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
            }
        });

        // Real-time fluctuations for the 3D globe heat map
        setInterval(() => {
            scatterData.forEach(d => {
                let fluctuation = Math.floor(Math.random() * 30) - 15;
                d.value[2] = Math.max(20, Math.min(150, d.value[2] + fluctuation)); // Heat fluctuates
            });
            myChart.setOption({ 
                series: [{ 
                    data: scatterData.map(d => {
                        return { name: d.name, value: [d.value[0], d.value[1], 0.02, d.value[2]] };
                    })
                }] 
            });
        }, 1500);

        window.addEventListener('resize', () => { myChart.resize(); });
    }

    // --- 6. Manginisi Crazy Charts (RESTORED & AI Ensemble updated) ---
    function initCrazyCharts() {
        const chartDom = document.getElementById('jarvisCrazyChart');
        if (!chartDom) return;
        const myChart = echarts.init(chartDom);
        const option = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
            legend: { data: ['Neural Prediction', 'Actual Yield', 'Anomaly Spikes'], textStyle: {color: '#6B7280'} },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: [{ type: 'category', boundaryGap: false, data: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], axisLine: { lineStyle: {color: '#E2E8F0'}}, axisLabel: {color: '#6B7280'} }],
            yAxis: [{ type: 'value', splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } }, axisLabel: {color: '#6B7280'} }],
            series: [
                {
                    name: 'Neural Prediction', type: 'line', smooth: true,
                    data: [120, 132, 101, 134, 90, 230, 210],
                    itemStyle: {color: '#007BFF'},
                    areaStyle: { color: 'rgba(0, 123, 255, 0.1)'}
                },
                {
                    name: 'Actual Yield', type: 'line', smooth: true,
                    lineStyle: { width: 3, color: '#10B981', shadowColor: 'rgba(16, 185, 129, 0.4)', shadowBlur: 10 },
                    data: [220, 182, 191, 234, 290, 330, 310]
                },
                {
                    name: 'Anomaly Spikes', type: 'bar',
                    itemStyle: { color: '#EF4444', borderRadius: [5, 5, 0, 0] },
                    data: [15, 0, 42, 0, 85, 0, 115]
                }
            ]
        };
        myChart.setOption(option);
        window.addEventListener('resize', () => { myChart.resize(); });
        
        // Logs simulation explicitly showing the AI ensemble
        const tasks = [
            "Querying DeepSeek parameters for core structural anomalies...",
            "Gemini multi-modal vision analyzing topographical imagery...",
            "Claude synthesizing geopolitical context for extraction zones...",
            "ChatGPT processing logic constraints and safety margins...",
            "Manganisi Core: Aggregating all neural pathways...",
            "Cross-referencing global tectonic plate shifts via NASA JPL...",
            "MANGANISI OUTPUT OPTIMIZED. Awaiting commands..."
        ];
        
        setInterval(() => {
            const cl = document.getElementById('continuous-log');
            if(cl) {
                const el = document.createElement('div');
                el.className = 'log-entry';
                const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
                el.innerHTML = `<span style="color:#007BFF">[${time}]</span> > ${tasks[Math.floor(Math.random() * tasks.length)]}`;
                cl.appendChild(el);
                
                if (cl.children.length > 50) { cl.removeChild(cl.firstChild); }
                cl.scrollTop = cl.scrollHeight;
            }
        }, 1500);
    }

    setTimeout(() => {
        initOverviewCharts();
        initGlobalHeatmap();
        initCrazyCharts();
    }, 500);
});

// =========================================
// INITIALISATION DE LA CARTE
// =========================================
var map = L.map('map', {
    zoomControl: false,
    maxZoom: 20,
    minZoom: 1
}).setView([14.5, -14.5], 7);

// Hash pour les URLs
var hash = new L.Hash(map);

// Attribution
map.attributionControl.setPrefix('<a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');

// =========================================
// FONDS DE CARTE
// =========================================
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Â© OpenStreetMap contributors'
});

var dark = L.tileLayer('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: 'Â© CartoDB'
});

var satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: 'Â© Google'
});

// Couches pour la MiniMap (instances séparées)
var osmMini = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
var darkMini = L.tileLayer('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');
var satelliteMini = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}');

// Ajouter OSM par défaut
osm.addTo(map);
var currentBasemap = osm; // Variable pour suivre le fond de carte actuel

// =========================================
// CONTRÔLES DE LA CARTE
// =========================================
L.control.zoom({ position: 'topleft' }).addTo(map);
L.control.locate({
    position: 'topleft',
    strings: {
        title: "Se localiser"
    },
    locateOptions: {
        enableHighAccuracy: true
    }
}).addTo(map);

var measureControl = new L.Control.Measure({
    position: 'topleft',
    primaryLengthUnit: 'meters',
    secondaryLengthUnit: 'kilometers',
    primaryAreaUnit: 'sqmeters',
    secondaryAreaUnit: 'hectares'
});
// measureControl.addTo(map); // Ajouté dynamiquement

// Contrôle de dessin pour requêtes spatiales
var drawControl = new L.Control.Draw({
    draw: {
        polygon: true,
        polyline: false,
        rectangle: true,
        circle: true,
        marker: false,
        circlemarker: false
    },
    edit: {
        featureGroup: new L.FeatureGroup()
    }
});

// Recherche Photon
var photonControl = L.control.photon({
    position: 'topright',
    placeholder: 'Rechercher un lieu...'
});
photonControl.addTo(map);

// Mini map - initialisation
var miniMap = new L.Control.MiniMap(osmMini, {
    position: 'bottomright',
    toggleDisplay: false,
    minimized: false
}).addTo(map);

// =========================================
// COUCHES DE DONNÉES
// =========================================
// Fonction pour obtenir la couleur par région
function getRegionColor(name) {
    if (!name) return '#3388ff';
    var colors = {
        'DAKAR': '#FF0000',       // Rouge
        'DIOURBEL': '#00FF00',    // Vert
        'FATICK': '#0000FF',      // Bleu
        'KAFFRINE': '#FFFF00',    // Jaune
        'KAOLACK': '#FF00FF',     // Magenta
        'KÉDOUGOU': '#00FFFF',    // Cyan
        'KOLDA': '#800000',       // Marron
        'LOUGA': '#008000',       // Vert foncé
        'MATAM': '#000080',       // Bleu marine
        'SAINT-LOUIS': '#808000', // Olive
        'SÉDHIOU': '#800080',     // Pourpre
        'TAMBACOUNDA': '#008080', // Sarcelle
        'THIÈS': '#C0C0C0',       // Argent
        'ZIGUINCHOR': '#FFA500'   // Orange
    };
    return colors[name.toUpperCase()] || '#3388ff';
}

// Créer un groupe pour les labels des régions
var regionLabelsGroup = L.featureGroup();

var regionLayer = L.geoJSON(json_Region_3, {
    style: function(feature) {
        // Récupération du nom de la région pour la couleur
        var regionName = feature.properties['Région'] || feature.properties['Region'] || 'Inconnu';
        return {
            color: 'rgba(35,35,35,1.0)',
            weight: 1.0,
            fillColor: getRegionColor(regionName),
            fillOpacity: 0.5,
            pane: 'overlayPane'
        };
    },
    onEachFeature: function(feature, layer) {
        // Accéder à la propriété correctement encodée
        var regionName = 'Région inconnue';
        for (var key in feature.properties) {
            if (key.toLowerCase().includes('gion')) {
                regionName = feature.properties[key];
                break;
            }
        }
        
        layer.bindPopup('<strong>Région:</strong> ' + regionName);
        
        // Ajouter le label
        var bounds = layer.getBounds();
        var center = bounds.getCenter();
        
        var label = L.marker(center, {
            icon: L.divIcon({
                html: '<div style="background: white; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 13px; border: 2px solid #333; box-shadow: 0 2px 5px rgba(0,0,0,0.3); text-align: center; white-space: nowrap;">' + regionName + '</div>',
                className: 'region-label',
                iconSize: [140, 35],
                iconAnchor: [70, 17],
                popupAnchor: [0, -17]
            }),
            interactive: false
        });
        
        regionLabelsGroup.addLayer(label);
    }
}).addTo(map);

// Ajouter les labels au groupe et à la carte
regionLabelsGroup.addTo(map);

// Event listener pour clic sur région (requête spatiale)
regionLayer.on('click', function(e) {
    var regionFeature = e.layer.feature;
    var regionName = 'Région inconnue';
    for (var key in regionFeature.properties) {
        if (key.toLowerCase().includes('gion')) {
            regionName = regionFeature.properties[key];
            break;
        }
    }

    // Compter localités dans la région
    var countLocalites = 0;
    localitesLayer.eachLayer(function(marker) {
        var point = marker.toGeoJSON();
        if (turf.booleanPointInPolygon(point.geometry.coordinates, regionFeature.geometry)) {
            countLocalites++;
        }
    });

    // Départements dans la région
    var departements = [];
    departementLayer.eachLayer(function(layer) {
        var deptRegion = 'Région inconnue';
        for (var key in layer.feature.properties) {
            if (key.toLowerCase().includes('gion')) {
                deptRegion = layer.feature.properties[key];
                break;
            }
        }
        if (deptRegion === regionName) {
            for (var key in layer.feature.properties) {
                if (key.toLowerCase().includes('part') || key.toLowerCase().includes('dept')) {
                    departements.push(layer.feature.properties[key]);
                    break;
                }
            }
        }
    });

    // Arrondissements dans la région
    var arrondissements = [];
    arrondissementLayer.eachLayer(function(layer) {
        var arrRegion = 'Région inconnue';
        for (var key in layer.feature.properties) {
            if (key.toLowerCase().includes('gion')) {
                arrRegion = layer.feature.properties[key];
                break;
            }
        }
        if (arrRegion === regionName) {
            for (var key in layer.feature.properties) {
                if (key.toLowerCase().includes('arrondisse') || key.toLowerCase().includes('arr')) {
                    arrondissements.push(layer.feature.properties[key]);
                    break;
                }
            }
        }
    });

    // Afficher dans la console
    var info = '<strong>Région :</strong> ' + regionName + '<br>' +
               '<strong>Nombre de localités :</strong> ' + countLocalites + '<br>' +
               '<strong>Départements :</strong> ' + (departements.length > 0 ? departements.join(', ') : 'Aucun') + '<br>' +
               '<strong>Arrondissements :</strong> ' + (arrondissements.length > 0 ? arrondissements.join(', ') : 'Aucun');
    document.getElementById('info-console').innerHTML = info;
});

var departementLayer = L.geoJSON(json_Departement_4, {
    style: function(feature) {
        return {
            color: 'rgba(226,26,28,1.0)',
            weight: 4.0,
            fillColor: 'rgba(226,26,28,0.0)',
            fillOpacity: 0.0
        };
    },
    onEachFeature: function(feature, layer) {
        var deptName = 'Département inconnu';
        for (var key in feature.properties) {
            if (key.toLowerCase().includes('part') || key.toLowerCase().includes('dept')) {
                deptName = feature.properties[key];
                break;
            }
        }
        layer.bindPopup('<strong>Département:</strong> ' + deptName);
    }
}).addTo(map);

var arrondissementLayer = L.geoJSON(json_Arrondissement_5, {
    style: function(feature) {
        return {
            color: 'rgba(255,154,23,1.0)',
            weight: 2.0,
            fillColor: 'rgba(255,154,23,0.0)',
            fillOpacity: 0.0
        };
    },
    onEachFeature: function(feature, layer) {
        var arrName = 'Arrondissement inconnu';
        for (var key in feature.properties) {
            if (key.toLowerCase().includes('arrondisse') || key.toLowerCase().includes('arr')) {
                arrName = feature.properties[key];
                break;
            }
        }
        layer.bindPopup('<strong>Arrondissement:</strong> ' + arrName);
    }
}).addTo(map);

// Vérifier que json_Routes_6 existe
console.log('json_Routes_6 exists:', typeof json_Routes_6 !== 'undefined');
if (typeof json_Routes_6 !== 'undefined') {
    console.log('json_Routes_6 features count:', json_Routes_6.features.length);
    console.log('First feature:', json_Routes_6.features[0]);
}

var routesLayer = L.geoJSON(json_Routes_6, {
    style: function(feature) {
        var fonction = feature.properties['FONCTION'];
        var style = {
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        };
        
        console.log('Styling route with FONCTION:', fonction);
        
        // Symbologie basée sur la fonction - sans toLowerCase
        if (!fonction) {
            style.color = '#cccccc';
            style.weight = 2;
        } else if (fonction.indexOf('4 voies') !== -1) {
            style.color = '#d41159';
            style.weight = 6;
        } else if (fonction.indexOf('2 voies') !== -1) {
            style.color = '#ff6b35';
            style.weight = 5;
        } else if (fonction.indexOf('principale') !== -1) {
            style.color = '#ff0000';
            style.weight = 5;
        } else if (fonction.indexOf('secondaire') !== -1) {
            style.color = '#ffa500';
            style.weight = 3;
        } else if (fonction.indexOf('automobile') !== -1) {
            style.color = '#ffff00';
            style.weight = 2.5;
            style.dashArray = '3,3';
        } else if (fonction.indexOf('Chemin') !== -1 || fonction.indexOf('fer') !== -1) {
            style.color = '#000000';
            style.weight = 3;
            style.dashArray = '5,5';
        } else if (fonction.indexOf('Digue') !== -1) {
            style.color = '#00ff00';
            style.weight = 3;
        } else if (fonction.indexOf('piste') !== -1) {
            style.color = '#90ee90';
            style.weight = 2;
        } else {
            style.color = '#cccccc';
            style.weight = 2;
        }
        
        return style;
    },
    onEachFeature: function(feature, layer) {
        var fonction = feature.properties['FONCTION'] || 'Type inconnu';
        var longueur = feature.properties['LONGUEUR'] ? (feature.properties['LONGUEUR'] / 1000).toFixed(2) : 'N/A';
        layer.bindPopup('<strong>Fonction:</strong> ' + fonction + '<br><strong>Longueur:</strong> ' + longueur + ' km');
    }
}).addTo(map);

console.log('Routes layer added to map, layer count:', routesLayer.getLayers().length);

var localitesLayer = L.markerClusterGroup();
L.geoJSON(json_localites_7, {
    onEachFeature: function(feature, layer) {
        layer.bindPopup('<strong>Localité:</strong> ' + feature.properties['NOM']);
    },
    pointToLayer: function(feature, latlng) {
        return L.marker(latlng, {
            icon: L.divIcon({
                html: '<i class="fas fa-map-marker-alt" style="color: red; font-size: 18px;"></i>',
                className: 'custom-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            })
        });
    }
}).addTo(localitesLayer);
localitesLayer.addTo(map);

// =========================================
// CONTRÔLE DES COUCHES (ARBRE)
// =========================================
var overlaysTree = [
    {label: 'Régions', layer: regionLayer},
    {label: 'Départements', layer: departementLayer},
    {label: 'Arrondissements', layer: arrondissementLayer},
    {label: 'Routes', layer: routesLayer},
    {label: 'Localités', layer: localitesLayer}
];

var layerControl = L.control.layers.tree(null, overlaysTree, {
    collapsed: false
});
layerControl.addTo(map);
// Move to sidebar
var controlContainer = layerControl.getContainer();
if (controlContainer) {
    document.getElementById('layers-control').appendChild(controlContainer);
}

// =========================================
// LÉGENDE INTERACTIVE
// =========================================
map.on('layeradd', function(e) {
    if (e.layer === regionLayer) {
        document.getElementById('legend-regions').classList.remove('disabled');
    } else if (e.layer === departementLayer) {
        document.getElementById('legend-departements').classList.remove('disabled');
    } else if (e.layer === arrondissementLayer) {
        document.getElementById('legend-arrondissements').classList.remove('disabled');
    } else if (e.layer === routesLayer) {
        document.getElementById('legend-routes').classList.remove('disabled');
        document.getElementById('legend-pistes').classList.remove('disabled');
    } else if (e.layer === localitesLayer) {
        document.getElementById('legend-localites').classList.remove('disabled');
    }
});

map.on('layerremove', function(e) {
    if (e.layer === regionLayer) {
        document.getElementById('legend-regions').classList.add('disabled');
    } else if (e.layer === departementLayer) {
        document.getElementById('legend-departements').classList.add('disabled');
    } else if (e.layer === arrondissementLayer) {
        document.getElementById('legend-arrondissements').classList.add('disabled');
    } else if (e.layer === routesLayer) {
        document.getElementById('legend-routes').classList.add('disabled');
        document.getElementById('legend-pistes').classList.add('disabled');
    } else if (e.layer === localitesLayer) {
        document.getElementById('legend-localites').classList.add('disabled');
    }
});

// =========================================
// AFFICHAGES DYNAMIQUES
// =========================================
// Coordonnées dynamiques
map.on('mousemove', function(e) {
    document.getElementById('coord-display').innerHTML = 'Lat: ' + e.latlng.lat.toFixed(4) + ', Lng: ' + e.latlng.lng.toFixed(4);
});

// Échelle dynamique
function updateScale() {
    var zoom = map.getZoom();
    var scale = Math.round(591657550.5 / Math.pow(2, zoom - 1));
    document.getElementById('scale-display').innerHTML = 'Échelle: 1:' + scale.toLocaleString();
}
map.on('zoomend', updateScale);
updateScale();

// =========================================
// GESTION DES PANNEAUX
// =========================================
document.getElementById('layers-btn').addEventListener('click', function() {
    document.getElementById('layers-panel').classList.toggle('show');
});

document.getElementById('menu-btn').addEventListener('click', function() {
    document.getElementById('layers-panel').classList.toggle('show');
});

document.getElementById('close-layers-panel').addEventListener('click', function() {
    document.getElementById('layers-panel').classList.remove('show');
});

document.getElementById('basemaps-btn').addEventListener('click', function() {
    document.getElementById('basemaps-legend-panel').classList.toggle('show');
});

// =========================================
// GESTION DES FONDS DE CARTE
// =========================================
document.querySelectorAll('input[name="basemap"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        // Supprimer seulement le fond de carte actuel pour ne pas toucher aux autres couches
        if (currentBasemap) {
            map.removeLayer(currentBasemap);
        }
        
        var newLayer;
        var newMiniLayer;

        if (this.value === 'osm') {
            newLayer = osm;
            newMiniLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
        } else if (this.value === 'dark') {
            newLayer = dark;
            newMiniLayer = L.tileLayer('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');
        } else if (this.value === 'satellite') {
            newLayer = satellite;
            newMiniLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}');
        }
        
        newLayer.addTo(map);
        currentBasemap = newLayer; // Mettre à jour la référence

        // Mettre à jour la minimap
        try {
            map.removeControl(miniMap);
        } catch(e) {}
        
        miniMap = new L.Control.MiniMap(newMiniLayer, {
            position: 'bottomright',
            toggleDisplay: false,
            minimized: false
        }).addTo(map);
    });
});

// =========================================
// BOUTONS DE LA BARRE DE NAVIGATION
// =========================================
// Boutons de zoom
document.getElementById('zoom-in-btn').addEventListener('click', function() {
    map.zoomIn();
});

document.getElementById('zoom-out-btn').addEventListener('click', function() {
    map.zoomOut();
});

// Vue initiale
document.getElementById('home-btn').addEventListener('click', function() {
    map.setView([14.5, -14.5], 7);
});

// Impression
document.getElementById('print-btn').addEventListener('click', function() {
    window.print();
});

// Mesure
var measureActive = false;
document.getElementById('measure-btn').addEventListener('click', function() {
    if (measureActive) {
        map.removeControl(measureControl);
        measureActive = false;
    } else {
        measureControl.addTo(map);
        measureActive = true;
    }
});

// Recherche rapide (Photon)
document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        var query = this.value;
        photonControl.search(query);
    }
});

// =========================================
// REQUÊTES SPATIALES (DESSIN)
// =========================================
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Variable pour stocker les éléments mis en surbrillance
var highlightedItems = [];

function clearHighlights() {
    highlightedItems.forEach(function(item) {
        if (item.parentLayer && item.parentLayer.resetStyle) {
            item.parentLayer.resetStyle(item.layer);
        }
    });
    highlightedItems = [];
}

document.getElementById('draw-query').addEventListener('click', function() {
    drawControl.addTo(map);
    drawControl._toolbars.draw._modes.polygon.handler.enable();
});

document.getElementById('clear-query').addEventListener('click', function() {
    drawnItems.clearLayers();
    clearHighlights();
    map.removeControl(drawControl);
    document.getElementById('info-console').innerHTML = '';
});

map.on('draw:created', function(e) {
    var layer = e.layer;
    drawnItems.addLayer(layer);
    clearHighlights(); // Nettoyer les anciennes sélections

    var operator = document.getElementById('spatial-operator').value;
    var targetLayerVal = document.getElementById('spatial-layer').value;
    var results = [];

    // Définir les couches à interroger
    var layersToQuery = [];
    if (targetLayerVal === 'all') {
        layersToQuery = [regionLayer, departementLayer, arrondissementLayer, routesLayer];
    } else if (targetLayerVal === 'region') {
        layersToQuery = [regionLayer];
    } else if (targetLayerVal === 'departement') {
        layersToQuery = [departementLayer];
    } else if (targetLayerVal === 'arrondissement') {
        layersToQuery = [arrondissementLayer];
    } else if (targetLayerVal === 'routes') {
        layersToQuery = [routesLayer];
    }
    // Note: localitesLayer est traité séparément car c'est un MarkerCluster

    // Vérifier intersection avec les couches vectorielles (Polygones/Lignes)
    layersToQuery.forEach(function(lyr) {
        lyr.eachLayer(function(featureLayer) {
            var intersects = false;
            if (operator === 'intersects') {
                intersects = turf.intersect(featureLayer.toGeoJSON(), layer.toGeoJSON()) !== null;
            } else if (operator === 'contains') {
                intersects = turf.booleanContains(layer.toGeoJSON(), featureLayer.toGeoJSON());
            } else if (operator === 'within') {
                intersects = turf.booleanWithin(featureLayer.toGeoJSON(), layer.toGeoJSON());
            }
            if (intersects) {
                results.push(featureLayer);
            }
        });
    });

    // Pour les localités (points)
    localitesLayer.eachLayer(function(marker) {
        var point = marker.toGeoJSON();
        var intersects = false;
        if (operator === 'intersects') {
            intersects = turf.booleanPointInPolygon(point.geometry.coordinates, layer.toGeoJSON());
        } else if (operator === 'contains') {
            intersects = turf.booleanContains(layer.toGeoJSON(), point);
        } else if (operator === 'within') {
            intersects = turf.booleanWithin(point, layer.toGeoJSON());
        }
        if (intersects) {
            results.push(marker);
        }
    });

    // Afficher les résultats
    if (results.length > 0) {
        alert('Trouvé ' + results.length + ' entités intersectantes');
        results.forEach(function(r) {
            r.setStyle({color: 'yellow', weight: 3});
        });
    } else {
        alert('Aucune entité trouvée');
    }

    map.removeControl(drawControl);
});

// =========================================
// REQUÊTE ATTRIBUTAIRE GÉNÉRALE
// =========================================
document.getElementById('run-attribute-query').addEventListener('click', function() {
    var layerType = document.getElementById('attribute-layer').value;
    var field = document.getElementById('attribute-field').value;
    var value = document.getElementById('attribute-value').value;

    if (!field || !value) {
        alert('Veuillez remplir le champ et la valeur');
        return;
    }

    var targetLayer;
    var isMarkerLayer = false;
    
    if (layerType === 'region') targetLayer = regionLayer;
    else if (layerType === 'departement') targetLayer = departementLayer;
    else if (layerType === 'arrondissement') targetLayer = arrondissementLayer;
    else if (layerType === 'localites') {
        targetLayer = localitesLayer;
        isMarkerLayer = true;
    }
    else if (layerType === 'routes') targetLayer = routesLayer;

    var results = [];
    
    if (isMarkerLayer) {
        localitesLayer.eachLayer(function(layer) {
            if (layer.feature && layer.feature.properties[field] && 
                layer.feature.properties[field].toString().toLowerCase().includes(value.toLowerCase())) {
                results.push(layer);
            }
        });
    } else {
        targetLayer.eachLayer(function(layer) {
            if (layer.feature && layer.feature.properties[field] && 
                layer.feature.properties[field].toString().toLowerCase().includes(value.toLowerCase())) {
                results.push(layer);
                layer.setStyle({color: 'yellow', weight: 3});
            }
        });
    }

    if (results.length > 0) {
        // Mettre en évidence les résultats
        results.forEach(function(r) {
            if (!isMarkerLayer) {
                r.setStyle({color: 'yellow', weight: 3});
            }
            r.openPopup ? r.openPopup() : null;
        });
        
        // Zoomer sur les résultats
        if (results.length === 1) {
            if (isMarkerLayer) {
                map.setView(results[0].getLatLng(), 12);
            } else {
                map.fitBounds(L.geoJSON(results[0].toGeoJSON()).getBounds());
            }
        } else {
            var group = new L.FeatureGroup(results);
            map.fitBounds(group.getBounds());
        }
        
        // Afficher dans la console
        var resultInfo = '<strong>Résultats:</strong> ' + results.length + ' entité(s) trouvée(s)<br>';
        results.slice(0, 5).forEach(function(r, i) {
            if (r.feature) {
                resultInfo += '<strong>' + (i+1) + ':</strong> ' + (r.feature.properties[field] || 'N/A') + '<br>';
            }
        });
        if (results.length > 5) {
            resultInfo += '<strong>... et ' + (results.length - 5) + ' autres</strong>';
        }
        document.getElementById('info-console').innerHTML = resultInfo;
        alert('Trouvé ' + results.length + ' entité(s)');
    } else {
        alert('Aucune entité trouvée');
    }
});

// =========================================
// RECHERCHE DE LOCALITÉ
// =========================================
document.getElementById('search-localite').addEventListener('click', function() {
    var query = document.getElementById('localite-search').value.toLowerCase();
    var results = [];
    localitesLayer.eachLayer(function(marker) {
        if (marker.feature.properties['NOM'] && marker.feature.properties['NOM'].toLowerCase().includes(query)) {
            results.push(marker);
        }
    });
    if (results.length === 1) {
        map.setView(results[0].getLatLng(), 12);
    } else if (results.length > 1) {
        var group = new L.FeatureGroup(results);
        map.fitBounds(group.getBounds());
    } else {
        alert('Aucune localité trouvée avec ce nom.');
    }
});

// =========================================
// MENUS ET PLACEHOLDERS
// =========================================
document.getElementById('home-link').addEventListener('click', function() {
    alert('Page d\'accueil');
});

document.getElementById('about-link').addEventListener('click', function() {
    alert('À propos de l\'application SIG Sénégal');
});

document.getElementById('home-btn-panel').addEventListener('click', function() {
    map.fitBounds(regionLayer.getBounds());
});

document.getElementById('about-btn-panel').addEventListener('click', function() {
    const aboutModal = new bootstrap.Modal(document.getElementById('aboutModal'));
    aboutModal.show();
});

document.getElementById('catalog-link').addEventListener('click', function() {
    document.getElementById('layers-panel').classList.toggle('show');
});

document.getElementById('spatial-query-link').addEventListener('click', function() {
    document.getElementById('spatial-query-panel').classList.toggle('show');
});

document.getElementById('attribute-query-link').addEventListener('click', function() {
    document.getElementById('attribute-query-panel').classList.toggle('show');
});

// =========================================
// GESTION DES TÉLÉCHARGEMENTS
// =========================================
document.getElementById('btn-confirm-download').addEventListener('click', function() {
    var layerKey = document.getElementById('download-layer-select').value;
    var format = document.getElementById('download-format-select').value;
    
    // Récupération des données GeoJSON brutes
    var data = null;
    var fileName = "donnees";
    
    if (layerKey === 'region') { data = json_Region_3; fileName = "regions_senegal"; }
    else if (layerKey === 'departement') { data = json_Departement_4; fileName = "departements_senegal"; }
    else if (layerKey === 'arrondissement') { data = json_Arrondissement_5; fileName = "arrondissements_senegal"; }
    else if (layerKey === 'routes') { data = json_Routes_6; fileName = "routes_senegal"; }
    else if (layerKey === 'localites') { data = json_localites_7; fileName = "localites_senegal"; }
    
    if (!data) {
        alert("Erreur : Données non trouvées pour cette couche.");
        return;
    }

    if (format === 'geojson') {
        // Téléchargement GeoJSON
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName + ".geojson");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
    } else if (format === 'csv') {
        // Téléchargement CSV
        var csvContent = "data:text/csv;charset=utf-8,";
        // En-têtes
        var props = data.features[0].properties;
        var headers = Object.keys(props);
        csvContent += headers.join(",") + ",WKT_Geometry\r\n"; // Ajout colonne géométrie
        
        // Lignes
        data.features.forEach(function(feature) {
            var row = headers.map(function(header) {
                var val = feature.properties[header];
                // Gérer les virgules dans les textes
                return (typeof val === 'string' && val.includes(',')) ? `"${val}"` : val;
            });
            // Ajouter une géométrie simplifiée (Point ou Type)
            var geomType = feature.geometry.type;
            var coords = JSON.stringify(feature.geometry.coordinates).replace(/,/g, ' '); // Simplification rapide
            row.push(geomType); 
            
            csvContent += row.join(",") + "\r\n";
        });
        
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName + ".csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        
    } else if (format === 'shp') {
        // Téléchargement Shapefile (via shp-write)
        if (typeof shpwrite === 'undefined') {
            alert("La librairie de génération de Shapefile n'est pas chargée. Vérifiez votre connexion internet.");
            return;
        }
        
        var options = {
            folder: fileName,
            types: {
                point: fileName,
                polygon: fileName,
                line: fileName,
                polyline: fileName
            }
        };
        
        try {
            shpwrite.download(data, options);
        } catch (e) {
            console.error("Erreur shp-write:", e);
            alert("Erreur lors de la génération du fichier Shapefile. Veuillez réessayer ou choisir le format GeoJSON.");
        }
    }
    
    // Fermer la modale
    var downloadModal = bootstrap.Modal.getInstance(document.getElementById('downloadModal'));
    downloadModal.hide();
});

// Initialize constants
const RADIAN = 0.0174533
const CENTER = [18.14, -65.43]
const ZOOM = 12
const ZOOM_MOBILE = 11
const FORTIN = [18.147407888387857, -65.43913891363856]
const BOMBS = [18.136207887439014, -65.29454961419106]
const BOMBS_ZOOM = 14
const BOMBS_ZOOM_MOBILE = 13
const LANGUAGE = {
	es: {
		lang: "Espa&ntilde;ol",
		title: "&iexcl;Bombardea mi patio!",
		input: "Ingrese una dirección...",
		marker: "Est&aacute;s aqu&iacute; (El Fort&iacute;n Conde de Mirasol)",
		address: "Su dirección, como El Fort&iacute;n",
		reset: "De nuevo",
		about: {
			title: "Sobre",
			content:  "Una explicación vendrá pronto",
		},
		step: "Paso",
		of: "de",
		next: "Pr&oacute;ximo >",
		prev: "< Previo",
		occupy: "&iexcl;Ocupa mi patio!"
	},
	en: {
		lang: "English",
		title: "Bomb my backyard!",
		input: "Enter an address...",
		marker: "You are here (El Fort&iacute;n Conde de Mirasol)",
		address: "Your address, as El Fort&iacute;n",
		reset: "Reset",
		about: {
			title: "About",
			content: "During the US Navy's occupation of Vieques (1941-2003), the Navy occupied 22,000 acres of the island and conducted live bombing exercises. \"Bomb my Backyard\", named for the \"Not in My Backyard\" sentiment, allows you to visualize the extent of the Navy occupation and the proximity of the bombing exercises by placing an overlay of Vieques centered on an address of your choice. <br /><br />\"Bomb My Backyard\" was introduced at an exhibit hosted in El Fortín Conde de Mirasol in Isabel Segunda, Vieques. We use the distance between El Fortín and Navy actitivies when creating the overlay for the address you provide.",
		},
		step: "Step",
		of: "of",
		next: "Next >",
		prev: "< Prev",
		occupy: "Occupy my backyard!"
	}
}

const ISLAND_STYLE = {
	fill: true,
	fillColor: '#333333',
	fillOpacity: 0.2,
	opacity: 0.8,
	color: '#333333'
}
const NAVY_STYLE = {
	fill: true,
	fillColor: '#2B7F8B',
	fillOpacity: 0.3,
	color: '#2B7F8B'
}
const CRATER_STYLE = {
	fill: true,
	fillColor: '#A81407',
	fillOpacity: 0.3,
	color: '#A81407'
}

const SHOW_VIEQUES_OUTLINE = false
const SHOW_VIEQUES_NAVY = false
const SHOW_VIEQUES_CRATERS = false


// Initialize variables
let language
let map
let layers = {
	original: {},
	offset: {},
}
let data = {}
let offsetCoords
let scaleFactor = 1
let currentStep = 0

$(document).ready(() => {
	initializeLanguage()
	initializeReset()
	initializeAbout()
	initializeLeaftlet()
	initializeAddressFinder()
	initializeData()
	initializeWalkthrough()
})

// Initializers ============================================

function getZoom(isBomb) {
	if ($(window).width() < 960) {
		if (isBomb) return BOMBS_ZOOM_MOBILE
		return ZOOM_MOBILE 
	}
	if (isBomb) return BOMBS_ZOOM
	return ZOOM
}

function initializeAddressFinder() {
	const input = document.getElementById("address-input")
	const autocomplete = new google.maps.places.Autocomplete(input, {
		fields: ["formatted_address", "geometry", "name"],
		strictBounds: false,
	})
	autocomplete.addListener("place_changed", () => {
		handleAddressChange(autocomplete.getPlace())
	})
}

function initializeLanguage() {
	language = "en"
	handleLanguageChange()
	$("#language-switch").change(function() {
		if (language == "en") language = "es"
		else language = "en"
		handleLanguageChange()
	})
}

function initializeReset() {
	$("#reset").click(function() {
		center()
		reset()
		clear()
	})
}

function initializeAbout() {
	$("#about-button").click(function () {
		$("#about").addClass("visible")
	})
	$("#about-underlay").click(function() {
		$("#about").removeClass("visible")
	})
}

function initializeLeaftlet() {

    // Initialize map
	map = L.map('leaflet', { 
		attributionControl:false,  
		scrollWheelZoom: true
	})

    // Add Open Street Map layer
    L.tileLayer( 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		tms: false
    }).addTo(map)

	// Position zoom controls
	map.zoomControl.setPosition('bottomright')

    // Add marker to Fortin
    layers.original.marker = L.marker(FORTIN).addTo(map)
	layers.original.marker.bindTooltip(LANGUAGE[language].marker, {
		direction: 'auto',
		permanent: true,
	}).openTooltip()

	// Default center
	center()
}

function initializeData() {
	let promises = []
	promises.push($.ajax({
		dataType: "json",
		url: "island.geojson",
		success: function(geojson) {
			data.island = geojson.features[0]
			if (SHOW_VIEQUES_OUTLINE) {
				layers.original.island = new L.geoJson(data.island, ISLAND_STYLE)
				layers.original.island.addTo(map)
			}
		}
	}))
	promises.push($.ajax({
		dataType: "json",
		url: "navy.geojson",
		success: function(geojson) {
			data.navy = geojson.features[0]
			if (SHOW_VIEQUES_NAVY) {
				layers.original.navy = new L.geoJson(data.navy, NAVY_STYLE)
				layers.original.navy.addTo(map)
			}
		}
	}))
	promises.push($.ajax({
		dataType: "json",
		url: "craters.geojson",
		success: function(geojson) {
			data.craters = geojson
			if (SHOW_VIEQUES_CRATERS) {
				layers.original.craters = new L.geoJson(data.craters, NAVY_STYLE)
				layers.original.craters.addTo(map)
			}
		}
	}))
	Promise.all(promises).then(() => {
		$("#loading").addClass("done")
	})
}

function initializeWalkthrough() {
	$("#walkthrough-prev").click(function() {
		if (currentStep > 0) handleStepChange(currentStep-1)
	})
	$("#walkthrough-next").click(function() {
		if (currentStep < steps.length-1) handleStepChange(currentStep+1)
	})
}

// Handlers ===================================================

function center() {
	map.setView(CENTER, getZoom())
}

function clear() {
	$("#address-input").val("")
}

function reset() {

	// Remove all offset layers from map
	for (let key of Object.keys(layers.offset)) {
		map.removeLayer(layers.offset[key])
		delete layers.offset[key]
	}

	// Reset step
	currentStep = 0

	// Reset walkthrough
	$("#walkthrough").removeClass("active")

	// Reset button
	$("#reset").removeClass("active")

}

function handleLanguageChange() {
	$("#en").html(LANGUAGE.en.lang)
	$("#es").html(LANGUAGE.es.lang)
	$("title").html(LANGUAGE[language].title)
	$("#header").html(LANGUAGE[language].title)
	$("#address-input").attr("placeholder", LANGUAGE[language].input)
	$("#reset").html(LANGUAGE[language].reset)
	$("#about-button").html(LANGUAGE[language].about.title)
	$("#about-title").html(LANGUAGE[language].about.title)
	$("#about-content").html(LANGUAGE[language].about.content)
	if (layers.original.marker !== undefined) {
		layers.original.marker.setTooltipContent(LANGUAGE[language].marker)
	}
	if (layers.offset.marker !== undefined) {
		layers.offset.marker.setTooltipContent(LANGUAGE[language].address)
	}
	$("#walkthrough-prev").html(LANGUAGE[language].prev)
	$("#walkthrough-next").html(generateNextLanguage())
	$("#walkthrough-step").html(generateStepLanguage())
}

function handleAddressChange(place) {
	reset()

	// Handle non-existent place input
	if (!place.geometry || !place.geometry.location) {
		window.alert("Please select a suggestion from the dropdown")
		return;
	}

	// Setup reset button
	$("#reset").addClass("active")

	// Save event
	gtag("event", "submit_address", { address: place.formattedAddress })

	// Get coordinates
	offsetCoords = [place.geometry.location.lat(), place.geometry.location.lng()]

	// Set scale factor
	scaleFactor = getScaleFactorForNewPoint(offsetCoords, FORTIN)
	
	// Save offset layers =============================================

	// Marker
	layers.offset.marker = L.marker(offsetCoords)
	layers.offset.marker.bindTooltip(LANGUAGE[language].address, {
		direction: 'auto',
		permanent: true,
	}).openTooltip()
	layers.offset.marker.addTo(map)

	// Island
	let offsetIslandData = JSON.parse(JSON.stringify(data.island))
	shiftGeoJSONPolygonDataForNewPoint(offsetIslandData.geometry.coordinates, offsetCoords, scaleFactor)
	layers.offset.island = new L.geoJson(offsetIslandData, ISLAND_STYLE)

	// Navy
	let offsetNavyData = JSON.parse(JSON.stringify(data.navy))
	shiftGeoJSONPolygonDataForNewPoint(offsetNavyData.geometry.coordinates, offsetCoords, scaleFactor)
	layers.offset.navy = new L.geoJson(offsetNavyData, NAVY_STYLE)

	// Craters
	let offsetCratersData = JSON.parse(JSON.stringify(data.craters))
	for (let feature of offsetCratersData.features) {
		shiftGeoJSONPolygonDataForNewPoint(feature.geometry.coordinates, offsetCoords, scaleFactor)
	}
	layers.offset.craters = new L.geoJson(offsetCratersData, CRATER_STYLE)

	// Start steps ==============================

	// Go to new center
	centerOffset()

	// Reveal walkthrough
	$("#walkthrough").addClass("active")

	handleStepChange(0)
}

function centerOffset() {
	const offsetCenter = getRelativeCoordinatesForNewPoint(offsetCoords, CENTER, FORTIN, 1)
	map.setView(offsetCenter, getZoom())
}

const steps = ["island", "navy", "craters"]
function handleStepChange(step) {

	// Update position, zoom & layers
	if (steps[step] == "craters") {
		const offsetCratersCenter = getRelativeCoordinatesForNewPoint(offsetCoords, BOMBS, CENTER, 1)
		map.flyTo(offsetCratersCenter, getZoom(true), {
			duration: 3,
		})
		setTimeout(function() {
			map.addLayer(layers.offset.craters)
		}, 3000)
	} else {
		if (step < currentStep) {
			centerOffset()
			map.removeLayer(layers.offset[steps[step+1]])
		} else {
			map.addLayer(layers.offset[steps[step]])
		}
	}

	// Set current step
	currentStep = step;

	// Style buttons
	if (step < 1) $("#walkthrough-prev").addClass("disabled")
	else $("#walkthrough-prev").removeClass("disabled")
	if (currentStep == steps.length - 1) $("#walkthrough-next").addClass("disabled")
	else $("#walkthrough-next").removeClass("disabled")

	// Change button text
	$("#walkthrough-step").html(generateStepLanguage())
	$("#walkthrough-next").html(generateNextLanguage())
}

// Helpers ==========================================================

function generateStepLanguage() {
	return `${LANGUAGE[language].step} ${currentStep + 1} ${LANGUAGE[language].of} ${steps.length}`
}

function generateNextLanguage() {
	if (currentStep == 0){
		return LANGUAGE[language].occupy}
	if (currentStep == 1){
		return LANGUAGE[language].title}
	if (currentStep == 2){
		return LANGUAGE[language].title} 
}

function getScaleFactorForNewPoint(newPoint, originalPoint) {
	return Math.cos(newPoint[0] * RADIAN) / Math.cos(originalPoint[0] * RADIAN)
}

function shiftGeoJSONPolygonDataForNewPoint(polygonArray, newPoint, scaleFactor) {
	for (let i in polygonArray) {
		for (let j in polygonArray[i]) {
			for (let k in polygonArray[i][j]) {
				polygonArray[i][j][k] = getRelativeCoordinatesForNewGeoJSONPoint(polygonArray[i][j][k], newPoint, FORTIN, scaleFactor)
			}
		}
	}
}

function getRelativeCoordinatesForNewPoint(coordinates, newPoint, originalPoint, scaleFactor) {
	return [
		newPoint[0] + (coordinates[0] - originalPoint[0]),
		newPoint[1] + (scaleFactor * (coordinates[1] - originalPoint[1]))
	]
}

function getRelativeCoordinatesForNewGeoJSONPoint(coordinates, newPoint, originalPoint, scaleFactor) {
	return [
		newPoint[1] + (coordinates[0] - originalPoint[1]),
		newPoint[0] + (scaleFactor * (coordinates[1] - originalPoint[0]))
	]
}

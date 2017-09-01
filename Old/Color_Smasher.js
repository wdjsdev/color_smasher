

function colorSmasher (){
    var appVersion = app.version;
//~     $.writeln(appVersion);
    if (appVersion < 18){
        #target illustrator-17
        }
    else if (appVersion >= 18){
        #target illustrator-18
        }
	if (app.documents.length > 0){

		//Begin Functions

		function turnOffPrinting(){
			for (l=0; l<layers.length; l++){
				layers[l].printable = false;
//~ 				$.writeln("Layer " + (l + 1) + " printing off")
			} // end for loop L
		} // end function turnOffPrinting

		function existInkLayer(index){
			var inkLayer;
			try {
				inkLayer = layers.getByName("Ink Layer")
				inkLayer.remove(); // this ensures that we start with a fresh, blank layer each time
				inkLayer = layers.add();
				inkLayer.name = "Ink Layer";
				inkLayer.printable = true;
//~ 				$.writeln("Removed old ink layer and added new");
//~ 				$.writeln("inkLayer.printable = " + inkLayer.printable);
//~ 				return inkLayer;
				} // end try
			catch(err) {
				inkLayer = layers.add();
				inkLayer.name = "Ink Layer";
				inkLayer.printable = true;
//~ 				$.writeln("No ink layer found. Created new one.");
//~ 				$.writeln("inkLayer.printable = " + inkLayer.printable);
//~ 				return inkLayer;
				} // end catch
			docRef.selection = null;
			artboards.setActiveArtboardIndex(index);
			docRef.selectObjectsOnActiveArtboard();
			for (c=0; c<docRef.selection.length; c++){
				var currentSelection = docRef.selection[c];
				currentSelection.duplicate(inkLayer, ElementPlacement.PLACEATEND);
				} // end for loop C
			redraw();
//~ 			$.writeln("Artwork copied to inkLayer");
			} // end function existCheckLayer

		
		function writeInkList(index){
			var inkList = docRef.inkList;
			var undesirable = ['process cyan', 'process magenta', 'process yellow', 'process black', 'cut line', 'cut', 'edge', 'edge1', 'edge2', 'deleted global color',//
                                        'deleted golbal color 1', 'deleted global color 2', 'deleted global color 3', 'deleted global color 4', 'deleted global color 5', //
                                        'thru-cut', 'sew line', 'sewline', 'info b', 'jock tag b'];
			var thisList = [];
			for (i=0; i<inkList.length; i++){
				var thisInk = inkList[i]; 
//~ 				$.writeln(thisInk + thisInk.inkInfo.printingStatus);
				if(thisInk.inkInfo.printingStatus == InkPrintStatus.ENABLEINK){
					var pushColor = true;
					for (u=0; u<undesirable.length; u++){
//~ 						$.writeln(thisInk.name.toLowerCase());
//~ 						$.writeln(undesirable[u] + " undesirable");
						if (thisInk.name.toLowerCase() == undesirable[u]){
							pushColor = false;
							} // end if
						} // end for loop U
					if (pushColor == true){
						thisList.push(thisInk.name);
						} // end if
					} // end if printing status enabled
				} // end for loop I
//~ 			$.writeln("Colors on artboard " + (index+1) + " : " + thisList);
			return thisList;
			} // end function writeInkList
		
		function makeColorChips(artboardSwatches, artboardIndex){
			var aB = artboards[artboardIndex];
			var aBRect = aB.artboardRect;
			var x = aBRect[0] - 95;
			var y = aBRect[3] + 60;
			if (artboardSwatches.length > 0){
				var chipGroup = layers[0].groupItems.add();
				chipGroup.name = "Swatches for Artboard " + (artboardIndex+1);
				var lightSwatch = null;
				var darkSwatch = null;
				try {
					var lightSwatch = swatches.getByName("Black B").color;
				} // end try set light swatch text color
				catch (err) {
					var blackLabel = docRef.spots.add();
					blackLabelColor = new CMYKColor();
					blackLabelColor.cyan = 72;
					blackLabelColor.magenta = 67;
					blackLabelColor.yellow = 63;
					blackLabelColor.black = 72;
					blackLabel.name = "Black B";
					blackLabel.color = blackLabelColor;
					blackLabel.colorType = ColorModel.SPOT;
					blackLabel.tint = 100;
					lightSwatch = swatches.getByName("Black B").color;
//~ 					$.writeln("Created Black B Swatch");
				} // end catch
				try {
					darkSwatch = swatches.getByName("White B").color;
				} // end try set dark swatch text color
				catch (err) {
					whiteLabel = docRef.spots.add();
					whiteLabelColor = new CMYKColor();
					whiteLabelColor.cyan = 0;
					whiteLabelColor.magenta = 0;
					whiteLabelColor.yellow = 0;
					whiteLabelColor.black = 0;
					whiteLabel.name = "White B";
					whiteLabel.color = whiteLabelColor;
					whiteLabel.colorType = ColorModel.SPOT;
					whiteLabel.tint = 100;
					darkSwatch = swatches.getByName("White B").color;
//~ 					$.writeln("Created White B Swatch");

				} // end catch 
				for (m=0; m<artboardSwatches.length; m++){
//~ 					$.writeln(artboardSwatches[m] + " artboard swatch [" + m + "]");
					var currentSwatch = artboardSwatches[m];
					var darkSwatches = ['black b', 'dark green b', 'maroon b', 'cardinal b', 'navy b', 'royal blue b', 'brown b', 'dark charcoal b', 'purple b', 'kelly green b', 'columbia b', 'teal b']
					var colorBox = chipGroup.pathItems.rectangle(y,x+=100, 100, 20);
					var textBox = chipGroup.pathItems.rectangle(y-6, x+5, 90, 15);
					var textRefBox = chipGroup.textFrames.areaText(textBox);
					var useTextColor = lightSwatch;
					textRefBox.contents = currentSwatch;
					for (d=0; d<darkSwatches.length; d++){
//~ 						$.writeln(currentSwatch.toLowerCase());
						if (currentSwatch.toLowerCase() == darkSwatches[d]){
							textRefBox.textRange.fillColor = darkSwatch;
							useTextColor = darkSwatch;
						} // end if dark swatch
					} // end for loop D
					textRefBox.textRange.fillColor = useTextColor;
					colorBox.stroked = false;
					colorBox.filled = true;
                       	try{
                            colorBox.fillColor = swatches.getByName(currentSwatch).color;
                        } // end try
                       	catch(err){
                           alert("You need to update your swatches panel first. Undo and then try again.");
                        } // end catch
					if (currentSwatch == "White B"){
						colorBox.stroked = true;
						colorBox.strokeColor = swatches.getByName("Black B").color;
					} // end if swatch is white
				} // end for loop M
				
				try{
					var destLayer = layers.getByName("BKGRD, do not unlock");
				}
				catch(e){
					var destLayer = layers[layers.length-1];
				}
				destLayer.locked = false;
				chipGroup.moveToBeginning(destLayer);
				if(destLayer.name == "BKGRD, do not unlock"){
					destLayer.locked = true;
				}
			
				try {
					if (layers[0].name == "Ink Layer"){
						layers[0].remove();
					} // end if
				} // end try
				catch (err) {
//~ 				$.writeln("No Ink Layer Present");
				} // end catch
			} //end if artboardSwatches.length > 0
		}  // end function makeColorChips
		
		function turnOnPrinting(){
			for (o=0; o<layers.length; o++){
				layers[o].printable = true;
				} // end for loop O
			} // end function turnOnPrinting
			
		function removeOldChips(){
			try{
				var theLayer = layers.getByName("BKGRD, do not unlock");
			}
			catch(e){
				var theLayer = layers[layers.length-1];
			}
			theLayer.locked = false;
			theLayer.visible = true;
			for(var a=theLayer.groupItems.length-1;a>-1;a--){
				var curGroup = theLayer.groupItems[a];
				if (curGroup.name.substring(0,2) == "Sw"){
					curGroup.remove();
				}
			}
// 			theLayer.locked = true;
		}

		
	// Begin Global Variables and main script
		
	var docRef = app.activeDocument;
	var layers = docRef.layers;
	var swatches = docRef.swatches;
	var artboards = docRef.artboards;
	docRef.selection = null;
	
	removeOldChips();
	for (a=0; a< artboards.length; a++){
		turnOffPrinting();
		existInkLayer(a);
		var artboardSwatches = (writeInkList(a));
		makeColorChips(artboardSwatches, a);
		} // end for loop A
	turnOnPrinting();
	docRef.selection = null;

	} // end if document exist

	else {
		alert("No Document Open");
	} // end else

} // end function colorSmasher
colorSmasher();
 // end script
 

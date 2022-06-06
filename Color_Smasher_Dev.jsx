/*



Script Name: Color Smasher 3.0
Author: William Dowling
Build Date: 2 September, 2016
Description: Rebuild of color smasher script for increased efficiency, error handling, and comments
Build number: 3

/*Step By Step
	
	for each artboard
		add in progress indicator
		duplicate all artwork onto Ink Layer
		turn off printing for every layer except Ink Layer
		generate inklist
			all colors except undesirables
		create color chips
		remove inkLayer
		remove in progress indicator


*/
#target Illustrator
function container()
{

	var valid = true;
	var scriptName = "color_smasher";

	function getUtilities()
	{
		var result = [];
		var utilPath = "/Volumes/Customization/Library/Scripts/Script_Resources/Data/";
		var ext = ".jsxbin"

		//check for dev utilities preference file
		var devUtilitiesPreferenceFile = File("~/Documents/script_preferences/dev_utilities.txt");

		if(devUtilitiesPreferenceFile.exists)
		{
			devUtilitiesPreferenceFile.open("r");
			var prefContents = devUtilitiesPreferenceFile.read();
			devUtilitiesPreferenceFile.close();
			if(prefContents === "true")
			{
				utilPath = "~/Desktop/automation/utilities/";
				ext = ".js";
			}
		}

		if($.os.match("Windows"))
		{
			utilPath = utilPath.replace("/Volumes/","//AD4/");
		}

		result.push(utilPath + "Utilities_Container" + ext);
		result.push(utilPath + "Batch_Framework" + ext);

		if(!result.length)
		{
			valid = false;
			alert("Failed to find the utilities.");
		}
		return result;

	}

	var utilities = getUtilities();
	for(var u=0,len=utilities.length;u<len;u++)
	{
		eval("#include \"" + utilities[u] + "\"");	
	}

	if(!valid)return;

	logDest.push(getLogDest());


	
	/*****************************************************************************/

	///////Begin/////////
	///Logic Container///
	/////////////////////


	//sendErrors Function Description
	//Send an alert to the user describing the error that occurred
	function sendErrors(e)
	{
		alert(e);
		return;
	}


	//getLabelColor Function Description:
	//Set global variable to the spot color "Info B"
	//If This color does not yet exist in the document swatches, create a new swatch
	function getLabelColor()
	{
		log.h("Beginning execution of getLabelColor function.");
		// var valid = false;
		var result = makeNewSpotColor("Info B");

		// try
		// {
		// 	result = swatches["Info B"];
		// 	valid = true;
		// 	log.l("Label color swatch successfully set to Info B.");
		// }
		// catch (e)
		// {
		// 	log.l("Info B did not exist. Creating a new swatch.");
		// 	var newSwatch = docRef.spots.add();
		// 	newSwatch.name = "Info B";

		// 	var thisColor = new CMYKColor();
		// 	thisColor.cyan = 100;
		// 	thisColor.magenta = 100;
		// 	thisColor.yellow = 100;
		// 	thisColor.black = 100;

		// 	newSwatch.color = thisColor;
		// 	newSwatch.colorType = ColorModel.SPOT;
		// 	newSwatch.tint = 100;
		// 	valid = true;
		// 	result = newSwatch
		// 	log.l("Successfully created Info B swatch.");
		// }

		// if (!valid)
		// {
		// 	log.e("Failed while trying to create an Info B swatch.");
		// 	errorList.push("Failed while setting 'Info B' color.\nTry manually adding the 'Info B' swatch to the document swatches panel and try again.\nOtherwise, please restart Illustrator.");
		// }

		log.l("End of getLabelColor function. Returning " + result + ".\n");

		return result;
	}



	//removeOldChips Function Description:
	//search for any existing color chips and remove
	//This function is executed at the beginning to ensure a clean slate
	function removeOldChips()
	{
		log.h("Beginning execution of removeOldChips function.");
		try
		{
			var theLayer = layers["BKGRD, do not unlock"];
			log.l("Set theLayer to BKGRD, do not unlock");
		}
		catch (e)
		{
			//set theLayer to the bottom-most layer
			var theLayer = layers[layers.length - 1];
			log.l("No BKGRD layer present. Using the bottom layer which is " + theLayer.name);
		}

		theLayer.locked = false;
		theLayer.visible = true;
		for (var L = theLayer.groupItems.length - 1; L > -1; L--)
		{
			var curGroup = theLayer.groupItems[L];
			if (curGroup.name.indexOf("Swatches") > -1)
			{
				curGroup.remove();
			}
		}
		theLayer.locked = true;
		log.l("End of removeOldChips function. Successfully removed all old color chips.\n");
	}



	//inProgIndicator Function Description:
	//Create/remove in progress indicator on the current artboard
	//This helps the artist know whether they need to continue undoing in the event of a runtime error.
	//When the artist executes enough undos, all indicators will be gone.
	function inProgIndicator(bool, index)
	{
		log.h("Beginning execution of inProgIndicator function with arguments: ::=>bool = " + bool + "::=>index = " + index);
		if (bool)
		{
			log.l("Adding the inprogress indicator.");
			var aB = artboards[index];
			var h = aB.artboardRect[3] - aB.artboardRect[1];
			var w = aB.artboardRect[2] - aB.artboardRect[0];
			var txt = layers[0].textFrames.add();
			txt.name = "inProg";
			txt.contents = "IN PROGRESS";
			txt.width = w;
			txt.height = Math.abs(h);
			txt.left = 0;
			txt.top = 0;
			txt.textRange.fillColor = labelColor.color;
			txt.locked = true;
		}
		else
		{
			log.l("Removing in progress indicator.");
			var txt = layers[0].textFrames["inProg"];
			txt.locked = false;
			txt.remove();
		}
		log.l("End of inProgIndicator function. Successfully created or removed the indicator.\n");
	}


	//setPrinting Function Description
	//Set all document layers to: printable = bool; 
	//This allows for copying the artwork to the "inkLayer" to accurately generate the InkList.
	//Use setPrintable(true) to turn on printing for all layers.
	function setPrintable(bool)
	{
		log.h("Beginning execution of setPrintable function. Setting all layers to printable = " + bool);
		for (var p = 0; p < layers.length; p++)
		{
			layers[p].printable = bool;
		}
		log.l("End of setPrintable function. Successfully set printable property of all layers.\n");
	}



	//existInkLayer Function Description:
	//check for the existence of an Ink Layer.
	//If one exists, delete it and create a new one to ensure a clean slate
	//Else Create one
	function existInkLayer()
	{
		log.h("Beginning execution of existInkLayer function.");
		var inkLayer;
		try
		{
			inkLayer = layers["Ink Layer"];
			log.l("An ink layer already exists.");
			inkLayer.remove();
			inkLayer = layers.add();
			inkLayer.name = "Ink Layer";
			inkLayer.printable = true;
			log.l("Removed existing ink layer and created a new fresh one.");
		}
		catch (e)
		{
			log.l("No ink layer exists.");
			inkLayer = layers.add();
			inkLayer.name = "Ink Layer";
			inkLayer.printable = true;
			log.l("Successfully created a new ink layer.");
		}
		log.l("End of existInkLayer function. Returning " + inkLayer + ".\n");
		return inkLayer;
	}



	//duplicateArt Function Description:
	//duplicate selected artwork (all unlocked artwork on active artboard) to the Ink Layer
	function duplicateArt(sel, lay)
	{
		log.l("Beginning execution of duplicateArt function.");
		for (var d = 0; d < sel.length; d++)
		{
			sel[d].duplicate(lay);
		}
		log.l("End of duplicateArt function. The selected art has been successfully copied to " + lay);
	}



	//generateInkList Function Description:
	//push all non-undesirable inkList colors to array
	function generateInkList()
	{
		log.h("Beginning execution of generateInkList function.");
		app.redraw();
		var inkList = docRef.inkList;
		log.l("The following colors are in the inkList.::" + inkList.join("::"));
		var trueColors = [];

		if (template)
		{
			log.l("File is a script template. Set the undesirable colors to the template undesirables array.");
			undesirable = library.undesirables.template;
		}
		else
		{
			log.l("File is not a template. Set the undesirable colors to the non-template undesirables array.");
			undesirable = library.undesirables.nonTemplate;
		}
		for (var i = inkList.length - 1; i > -1; i--)
		{
			var dontUse = false;
			var thisInk = inkList[i];
			if (thisInk.inkInfo.printingStatus == InkPrintStatus.DISABLEINK)
			{
				log.l(thisInk + " is disabled. Skipping this color.");
				// inkList.splice(i,1);
				continue;
			}
			for (var u = 0; u < undesirable.length; u++)
			{
				if (thisInk.name.toLowerCase() == undesirable[u])
				{
					// inkList.splice(i,1);
					log.l(thisInk.name + " is undesirable. Skipping this color.");
					dontUse = true;
					break;
				}
			}

			//this swatch is printable and is not undesirable
			if (!dontUse)
			{
				log.l(thisInk + " is printable and not undesirable. Pushing it to the trueColors array.");
				trueColors.push(inkList[i].name);
				if (inkList[i].name == "Navy B")
				{
					library.navyGray.navy = true;
				}
				else if (inkList[i].name == "Navy 2 B")
				{
					library.navyGray.navy2 = true;
				}
				else if (inkList[i].name == "Gray B")
				{
					library.navyGray.gray = true;
				}
				else if (inkList[i].name == "Gray 2 B")
				{
					library.navyGray.gray2 = true;
				}
				else if(inkList[i].name == "Charcoal B")
				{
					library.navyGray.charcoal = true;
				}
				else if(inkList[i].name == "Charcoal 2 B")
				{
					library.navyGray.charcoal2 = true;
				}
			}
		}

		if (library.navyGray.navy && library.navyGray.navy2)
		{
			log.e("File contains Navy B and Navy 2 B.");
			errorList.push("You have 'Navy B' AND 'Navy 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;

		}

		if (library.navyGray.gray && library.navyGray.gray2)
		{
			log.e("File contains Gray B and Gray 2 B.");
			errorList.push("You have 'Gray B' AND 'Gray 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;
		}

		if (library.navyGray.charcoal && library.navyGray.charcoal2)
		{
			log.e("File contains Charcoal B and Charcoal 2 B.");
			errorList.push("You have 'Charcoal B' AND 'Charcoal 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;
		}

		log.l("End of generateInkList function. Returning " + trueColors);
		return trueColors;
	}



	//makeColorChips Function Description
	//take array of colors for the current artboard and create one color chip for each
	function makeColorChips(colors, aB, dest)
	{
		log.h("Beginning execution of makeColorChips function.");
		var height = aB.artboardRect[1] - aB.artboardRect[3];
		var relativeVerticalPlacement = aB.artboardRect[3] + (height * .062);


		dest.locked = false;


		var chipGroup = dest.groupItems.add();
		chipGroup.name = "Swatches for Artboard " + (a + 1);

		//determine chip width. each chip should be 1/8th the width of the document;.
		var chipWidth = aB.artboardRect[2] - aB.artboardRect[0];
		chipWidth = chipWidth - 10;
		chipWidth = chipWidth / 7;

		//set chip height
		var chipHeight = 20;

		//set position of first chip
		var x = aB.artboardRect[0] - chipWidth + 5;
		var y = relativeVerticalPlacement;

		var swatchCounter = 1;

		//loop each color and create a chip and label
		for (var m = colors.length - 1; m > -1; m--)
		{
			var curSwatch = colors[m];
			if (curSwatch.toLowerCase().indexOf("process") == -1)
			{
				try
				{
					var blahSwatch = swatches[curSwatch];
				}
				catch (e)
				{
					//this swatch doesn't exist.. skip it.
					log.e(curSwatch + " does not exist in the swatches panel. Skipping this color.")
					continue;
				}
			}
			var thisGroup = chipGroup.groupItems.add();
			thisGroup.name = curSwatch;
			var tint = 0;

			//determine tint of label color
			for (var t = 0; t < library.lightSwatches.length; t++)
			{
				if (curSwatch.toLowerCase() == library.lightSwatches[t])
				{
					//this swatch is light colored
					//set the label to display black so the label is still legible.
					log.l(curSwatch + " is a light colored swatch. Setting the label color tint to 100.");
					tint = 100;
					break;
				}
			}

			// create the color chip and label

			//Create background box that holds the fill color of the chip.

			if (swatchCounter == 8)
			{
				x = aB.artboardRect[0] - chipWidth + 5;
				y = relativeVerticalPlacement - 20;
			}
			else if (swatchCounter == 15)
			{
				x = aB.artboardRect[0] - chipWidth + 5;
				y = relativeVerticalPlacement - 40;
			}
			else if (swatchCounter == 22)
			{
				x = aB.artboardRect[0] - chipWidth + 5;
				y = relativeVerticalPlacement - 60;
			}
			else if (swatchCounter >= 29)
			{
				log.l("There are " + swatchCounter + " swatches in the document. This will likely cause issues with the RIP. User has been notified.");
				errorList.push("You probably have too many swatches in this document.\nThere may be issues with the RIP software with this many swatches..");
			}
			var colorBox = thisGroup.pathItems.rectangle(y, x += chipWidth, chipWidth, chipHeight);


			// if(chipGroup.groupItems.length < 8)
			// {
			// 	var colorBox = thisGroup.pathItems.rectangle(y,x+=chipWidth,chipWidth,chipHeight);
			// }

			// else if(chipGroup.groupItems.length >= 8 && chipGroup.groupItems.length < 15)
			// {
			// 	x = aB.artboardRect[0] - chipWidth + 5;
			// 	// y = aB.artboardRect[3] + 40;
			// 	y = relativeVerticalPlacement - 20;
			// 	var colorBox = thisGroup.pathItems.rectangle(y,x+=chipWidth,chipWidth,chipHeight);
			// }
			// else if(chipGroup.groupItems.length >= 15)
			// {
			// 	x = aB.artboardRect[0] - chipWidth + 5;
			// 	y = relativeVerticalPlacement - 40;
			// 	var colorBox = thisGroup.pathItems.rectangle(y,x+=chipWidth,chipWidth,chipHeight);
			// }

			if (curSwatch.indexOf("Process") > -1)
			{
				log.l(curSwatch + " is a process color. Setting fill to false and label color to black.");
				colorBox.filled = false;
				tint = 100;
			}
			else
			{
				log.l(curSwatch + " is a spot color. Setting fill of colorBox to " + curSwatch);
				colorBox.filled = true;
				colorBox.fillColor = swatches.getByName(curSwatch).color;
			}
			if (curSwatch != "White B")
			{
				colorBox.stroked = false;
			}
			else
			{
				log.l(curSwatch + " is white. Adding a stroke to the colorBox to it remains visible.");
				colorBox.stroked = true;
				colorBox.strokeColor = labelColor.color;
				colorBox.strokeWidth = 0.3;
			}

			//Create a box to hold area text and a textFrame inside that box.
			var textBox = thisGroup.pathItems.rectangle(y - 6, x + 5, chipWidth - 10, 15); //no stroke/no fill container to hold the dimensions of the textFrame
			textBox.filled = false;
			textBox.stroked = false;
			var textRefBox = thisGroup.textFrames.areaText(textBox); //Text frame that holds the name of the swatch
			textRefBox.contents = curSwatch;
			textRefBox.textRange.fillColor = labelColor.color;
			textRefBox.textRange.fillColor.tint = tint;
			if (textRefBox.textRange.characters.length > 8 && textRefBox.textRange.characters.length <= 15)
			{
				textRefBox.textRange.characterAttributes.horizontalScale = 75;
			}
			else if (textRefBox.textRange.characters.length > 15 && textRefBox.textRange.characters.length <= 20)
			{
				textRefBox.textRange.characterAttributes.horizontalScale = 55;
			}
			else if (textRefBox.textRange.characters.length > 20)
			{
				textRefBox.textRange.characterAttributes.horizontalScale = 45;
			}

			log.l("Successfully created a colorBox and inserted a text frame with the contents: " + textRefBox.contents);
			swatchCounter++;
		}
		dest.locked = true;
		log.l("End of makeColorChips function.");
	}



	//getDest Function Description
	//Determine proper layer to place color chips on
	function getDest(template)
	{
		log.h("Beginning execution of getDest function.");
		if (template)
		{
			log.l("File is a template. Setting destLayer to BKGRD, do not unlock");
			var destLayer = layers["BKGRD, do not unlock"];
		}
		else
		{
			log.l("File is not a template.");
			try
			{
				var destLayer = layers["Artboard Swatches"];
				log.l("Set destLayer to \"Artboard Swatches\"");
			}
			catch (e)
			{
				var destLayer = layers.add();
				destLayer.name = "Artboard Swatches";
				destLayer.zOrder(ZOrderMethod.SENDTOBACK);
				log.l("Created a new Artboard Swatches layer.");
			}
		}
		log.l("End of getDest function. Returning " + destLayer);
		return destLayer;
	}



	//lockUnlockLayers Function Description
	//If the file is a template file, comb through layer structure and ensure
	//all layers are correctly locked or unlocked as required
	// function lockUnlockLayers()
	// {
	// 	log.h("Beginning execution of lockUnlockLayers function.");
	// 	for(var L=0;L<layers.length;L++)
	// 	{
	// 		if(layers[L].name.indexOf("FD")>-1 && layers[L].name.indexOf("non-temp")==-1)
	// 		{
	// 			var thisLayer = layers[L];
	// 			thisLayer.layers["Information"].locked = true;
	// 			thisLayer.layers["Mockup"].locked = false;
	// 			thisLayer.layers["Artwork Layer"].locked = false;
	// 		}
	// 		else if(layers[L].name == "Guides" || layers[L].name == "BKGRD, do not unlock")
	// 		{
	// 			layers[L].locked = true;
	// 		}
	// 	}
	// 	log.l("End of lockUnlockLayers function.");
	// }

	function unlockLayers()
	{
		log.h("Beginning execution of unlockLayers function.");
		var layLen = layers.length;
		var thislay;
		for (var l = 0; l < layLen; l++)
		{
			thisLay = layers[l];
			try
			{
				thisLay.layers["Artwork Layer"].locked = false;
				thisLay.layers["Mockup"].locked = false;
				thisLay.layers["Information"].locked = true;
				thisLay.layers["Prepress"].visible = false;
			}
			catch (e)
			{
				log.l("Looks like this isn't a template layer. moving on.");
			}
		}
	}

	function preflightSwatches()
	{
		var result = true;

		var dupSwatches = [];

		var dupSwatchPat = /[a-z\s]*b[\d]$/i
		var bSwatchPat = /^b[\d]{1,}$/i;

		for(var x=0;x<swatches.length;x++)
		{
			if(dupSwatchPat.test(swatches[x].name) && !bSwatchPat.test(swatches[x].name))
			{
				dupSwatches.push(swatches[x].name);
			}
		}

		if(dupSwatches.length)
		{
			result = false;
			alert("Document contains the following colors that need to be merged:\n" + dupSwatches.join("\n"));
		}
		return result;
	}

	function displayCheckBoombahLogoDialog()
	{
		var imgIndex = getRandom(1,7);
		$.writeln("imgIndex = " + imgIndex);
		var w = new Window("dialog","Make sure the Boombah logo is not hidden.");
			var img = UI.iconButton(w,resourcePath + "Images/look_closely/look_closely_" + imgIndex + ".jpg",function(){w.close()});
		w.show();
	}



	////////End//////////
	///Logic Container///
	/////////////////////

	/*****************************************************************************/

	///////Begin////////
	////Data Storage////
	////////////////////

	var library = {
		undesirables:
		{
			template: ['jock tag b', 'thru-cut', 'info b', 'edge', 'cut line', 'cut', 'cutline', 'sewline', 'sew', 'sew line'],
			nonTemplate: ['process cyan', 'process magenta', 'process yellow', 'process black', 'cut line', 'cut', 'edge', 'edge1', 'edge2', 'deleted global color', //
				'deleted golbal color 1', 'deleted global color 2', 'deleted global color 3', 'deleted global color 4', 'deleted global color 5', //
				'thru-cut', 'sew line', 'sewline', 'info b', 'jock tag b'
			]
		},

		lightSwatches: ["twitch b", "flo yellow b", "dark flesh b", "flesh b", "soft pink b", "vegas gold b", "optic yellow b", "yellow b", "lime green b", "white b", "gray b", "gray 2 b"],
		navyGray:
		{
			navy: false,
			navy2: false,
			gray: false,
			gray2: false
		}
	}

	////////End/////////
	////Data Storage////
	////////////////////

	/*****************************************************************************/

	///////Begin////////
	///Function Calls///
	////////////////////

	if (!valid)
	{
		return false;
	}

	//Global Variables
	var docRef = app.activeDocument;
	var layers = docRef.layers;
	var swatches = docRef.swatches;
	var artboards = docRef.artboards;
	var errorList = [];
	var scriptNotes = [];



	valid = preflightSwatches();

	if(!valid)
	{
		return false;
	}


	var template = isTemplate(docRef);

	var destLayer = getDest(template);

	var labelColor = getLabelColor();

	if (labelColor == null)
	{
		sendErrors(errorList);
		return;
	}

	//remove existing color chips if they already exist
	removeOldChips();


	//turn off printing for all layers
	setPrintable(false);

	//loop each artboard and generate chips for each individual artboard
	for (var a = 0; a < artboards.length; a++)
	{
		inProgIndicator(true, a);
		
		if (template)
		{
			// lockUnlockLayers();
			unlockLayers();
		}

		var inkLayer = existInkLayer();

		//set activeArtboardIndex and select all artwork on that artboard
		docRef.selection = null;
		artboards.setActiveArtboardIndex(a);
		docRef.selectObjectsOnActiveArtboard();

		//duplicate all of the selected artwork to the Ink Layer
		duplicateArt(docRef.selection, inkLayer);

		var colors = generateInkList();

		if (colors == null)
		{
			sendErrors(errorList);
			return;
		}


		if (colors.length < 1)
		{
			errorList.push("No Boombah colors were identified on artboard " + (a + 1) + "...?");
		}


		makeColorChips(colors, artboards[a], destLayer);



		if (inkLayer != undefined)
			inkLayer.remove();
		inProgIndicator(false);
	}

	//turn on printing for all layers
	setPrintable(true);

	displayCheckBoombahLogoDialog()

	docRef.selection = null;

	if (errorList.length > 0)
		sendErrors(errorList);

	printLog();

	////////End/////////
	///Function Calls///
	////////////////////

	/*****************************************************************************/

}
container();
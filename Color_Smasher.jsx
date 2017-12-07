/*



Script Name: Color Smasher 3.0
Author: William Dowling
Build Date: 2 September, 2016
Description: Rebuild of color smasher script for increased efficiency, error handling, and comments
Build number: 3

Version History:

Version 3.001
	2 September 2016
	Initial build.
	
Version 3.002
	6 September 2016
	Fixed infinite loop in generateInklist function
	Added an app.redraw() at the beginning of generateInklist function because docRef.inkList needs 
		to be refreshed before displaying the proper values.

Version 3.003
	08 September 2016
	Continued building makeColorChips function.
	Finished and tested makeColorChips function.
	Added contingency to place swatches on 2 rows if there are more than 8
	Added check for navy and navy2 and/or gray and gray2
	Currently working on multiple artboards. Could use some more testing, but it seems solid at the moment.
	Added a fix for when incorrect layers are locked and vice versa.

Version 3.004
	15 September 2016
	changed lockall layers function
	
Version 3.005
	21 September 2016
	reduced stroke weight of white color chip
	reversed the loop that deletes existing swatches
		it was running forward while deleting swatches, so some swatches were left behind as their index changed.

Version 3.006
	05 October 2016
	****CANCEL****
	reversed try/catch statement in getLabelColor function.
		Info B swatch was not being created when necessary and labels were showing up as a process color.
		Instead of trying to set the labelColor to an existing swatch, i'll try to create a new swatch and give it the name "Info B".
		If that fails due to the pre-existence of Info B, then set labelColor to the existing Info B swatch.
	****CANCEL****
	the above description was not the problem. The swatch was being properly created, but it was being incorrectly referenced when applied.
		I was attempting to apply the swatch incorrectly. i was trying to use the variable, rather than referencing the swatches panel and getting the swatch by name.

Version 3.007
	05 October 2016
	Adjusted the makeColorChips function to properly apply the label color by referencing swatches[labelColor.name].color
	Tested and working.

Version 3.008
	13 December, 2016
	Included additional check to make sure script doesn't trip up on non-template layers that contain "FD".

Version 3.009
	31 January, 2017
	Changing placement of color chips to a relative percentage of artboard height rather than an absolute height
		There have been issues with mockup artboards being different sizes between garments causing improper placement of color chips.
	Also set colorchips to size dynamically to the size of the mockup. color chips will be 1/7th the width of the mockup.
	Resized textRefBox to fit inside of the color chip. This is especially necessary on smaller mockups as the text becomes too large for the chip.

Version 3.010
	31 January, 2017
	Fixed getLabelColor function which was needlessly creating empty spot color swatches.
	Made additional adjustments to the text callouts in the color chips. Scaled their width conditionally to ensure they fit inside of the color chip.
	Added logic to chip row placement to accomodate more than 14 swatches. 

Version 3.011
	01 January, 2017
	Adjust the number of characters necessary before shrinking characterWidth.
		Certain colors are still having text cut off.

Version 3.012
	03 April, 2017
	Made a fix that caused an error when the script attempted to add a color that doesn't exist in the swatches panel.
		these colors are simply skipped now.

Version 4.001
	25 April, 2017
	Adding detailed logging.
*/


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

function container()
{

	var valid = true;
	eval("#include \"/Volumes/Customization/Library/Scripts/Script Resources/Data/Utilities_Container.jsxbin\"");
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
		var valid = false;
		var result;
		try
		{
			result = swatches["Info B"];
			valid = true;
			log.l("Label color swatch successfully set to Info B.");
		}
		catch(e)
		{
			log.l("Info B did not exist. Creating a new swatch.");
			var newSwatch = docRef.spots.add();
			newSwatch.name = "Info B";

			var thisColor = new CMYKColor();
			thisColor.cyan = 100;
			thisColor.magenta = 100;
			thisColor.yellow = 100;
			thisColor.black = 100;

			newSwatch.color = thisColor;
			newSwatch.colorType = ColorModel.SPOT;
			newSwatch.tint = 100;
			valid = true;
			result = newSwatch
			log.l("Successfully created Info B swatch.");
		}

		if(!valid)
		{
			log.e("Failed while trying to create an Info B swatch.");
			errorList.push("Failed while setting 'Info B' color.\nTry manually adding the 'Info B' swatch to the document swatches panel and try again.\nOtherwise, please restart Illustrator.");
		}

		log.l("End of getLabelColor function. Returning " + result + ".\n");

		return result;
	}



	//isTemplate Function Description:
	//Check whether the activeDocument is a scriptable template
	//Checking for specific layer structure
	function isTemplate()
	{
		log.h("Beginning execution of isTemplate function.");
		var template = false;

		var pat1 = /(FD|PS)[-_][\d|a-zA-Z]{3,6}.?[-_]/i;
		var pat2 = /(artwork)|(mockup)|(prepress)|(info)/i;
		var pat3 = /(FD..)[-_][\d]{3,4}/i;
		for(var t=0;t<layers.length;t++)
		{
			// if(layers[t].name.indexOf("FD")>-1 && layers[t].name.indexOf("non-temp")==-1)
			if(layers[t].name.indexOf("non-temp")==-1 && layers[t].name.indexOf("ontainer")== -1 && (pat1.test(layers[t].name) || pat3.test(layers[t].name)) && pat2.test(layers[t].layers[0]))
			{
				template = true;
				break;
			}
		}
		log.l("End of isTemplate function. Returning " + template + ".\n");
		return template;
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
		catch(e)
		{
			//set theLayer to the bottom-most layer
			var theLayer = layers[layers.length-1];
			log.l("No BKGRD layer present. Using the bottom layer which is " + theLayer.name);
		}

		theLayer.locked = false;
		theLayer.visible = true;
		for(var L=theLayer.groupItems.length-1;L>-1;L--)
		{
			var curGroup = theLayer.groupItems[L];
			if(curGroup.name.indexOf("Swatches")>-1)
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
	function inProgIndicator(bool,index)
	{
		log.h("Beginning execution of inProgIndicator function with arguments: ::=>bool = " + bool + "::=>index = " + index);
		if(bool)
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
		for(var p=0;p<layers.length;p++)
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
			log.l("An ink layer already exists.");
			inkLayer = layers["Ink Layer"];
			inkLayer.remove();
			inkLayer = layers.add();
			inkLayer.name = "Ink Layer";
			inkLayer.printable = true;
			log.l("Removed existing ink layer and created a new fresh one.");
		}
		catch(e)
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
	function duplicateArt(sel,lay)
	{
		log.l("Beginning execution of duplicateArt function.");
		for(var d=0;d<sel.length;d++)
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

		if(template)
		{
			log.l("File is a script template. Set the undesirable colors to the template undesirables array.");
			undesirable = library.undesirables.template;
		}
		else
		{
			log.l("File is not a template. Set the undesirable colors to the non-template undesirables array.");
			undesirable = library.undesirables.nonTemplate;
		}
		for(var i=inkList.length-1;i>-1;i--)
		{
			var dontUse = false;
			var thisInk = inkList[i];
			if(thisInk.inkInfo.printingStatus == InkPrintStatus.DISABLEINK)
			{
				log.l(thisInk + " is disabled. Skipping this color.");
				// inkList.splice(i,1);
				continue;
			}
			for(var u=0;u<undesirable.length;u++)
			{
				if(thisInk.name.toLowerCase() == undesirable[u])
				{
					// inkList.splice(i,1);
					log.l(thisInk.name + " is undesirable. Skipping this color.");
					dontUse = true;
					break;
				}
			}

			//this swatch is printable and is not undesirable
			if(!dontUse)
			{
				log.l(thisInk + " is printable and not undesirable. Pushing it to the trueColors array.");
				trueColors.push(inkList[i].name);
				if(inkList[i].name == "Navy B")
				{
					library.navyGray.navy = true;
				}
				else if(inkList[i].name == "Navy 2 B")
				{
					library.navyGray.navy2 = true;
				}
				else if(inkList[i].name == "Gray B")
				{
					library.navyGray.gray = true;
				}
				else if(inkList[i].name == "Gray 2 B")
				{
					library.navyGray.gray2 = true;
				}
			}
		}

		if(library.navyGray.navy && library.navyGray.navy2)
		{
			log.e("File contains Navy B and Navy 2 B.");
			errorList.push("You have 'Navy B' AND 'Navy 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;

		}
		else if(library.navyGray.gray && library.navyGray.gray2)
		{
			log.e("File contains Gray B and Gray 2 B.");
			errorList.push("You have 'Gray B' AND 'Gray 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;
		}
		log.l("End of generateInkList function. Returning " + trueColors);
		return trueColors;
	}



	//makeColorChips Function Description
	//take array of colors for the current artboard and create one color chip for each
	function makeColorChips(colors,aB,dest)
	{
		log.h("Beginning execution of makeColorChips function.");
		var height = aB.artboardRect[1] - aB.artboardRect[3];
		var relativeVerticalPlacement = aB.artboardRect[3] + (height * .062);
		

		dest.locked = false;


		var chipGroup = dest.groupItems.add();
		chipGroup.name = "Swatches for Artboard " + (a+1);

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
		for(var m=colors.length-1;m>-1;m--)
		{
			var curSwatch = colors[m];
			if(curSwatch.toLowerCase().indexOf("process")==-1)
			{
				try
				{
					var blahSwatch = swatches[curSwatch];
				}
				catch(e)
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
			for(var t=0;t<library.lightSwatches.length;t++)
			{
				if(curSwatch.toLowerCase() == library.lightSwatches[t])
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

			if(swatchCounter == 8)
			{
				x = aB.artboardRect[0] - chipWidth + 5;
				y = relativeVerticalPlacement - 20;
			}
			else if(swatchCounter == 15)
			{
				x = aB.artboardRect[0] - chipWidth + 5;
				y = relativeVerticalPlacement - 40;
			}
			else if(swatchCounter == 22)
			{
				x = aB.artboardRect[0] - chipWidth + 5;
				y = relativeVerticalPlacement - 60;
			}
			else if(swatchCounter >= 29)
			{
				log.l("There are " + swatchCounter + " swatches in the document. This will likely cause issues with the RIP. User has been notified.");
				errorList.push("You probably have too many swatches in this document.\nThere may be issues with the RIP software with this many swatches..");
			}
			var colorBox = thisGroup.pathItems.rectangle(y,x+=chipWidth,chipWidth,chipHeight);


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

			if(curSwatch.indexOf("Process")>-1)
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
			if(curSwatch != "White B")
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
			var textBox = thisGroup.pathItems.rectangle(y-6,x+5,chipWidth-10,15); //no stroke/no fill container to hold the dimensions of the textFrame
			textBox.filled = false;
			textBox.stroked = false;
			var textRefBox = thisGroup.textFrames.areaText(textBox); //Text frame that holds the name of the swatch
			textRefBox.contents = curSwatch;
			textRefBox.textRange.fillColor = labelColor.color;
			textRefBox.textRange.fillColor.tint = tint;
			if(textRefBox.textRange.characters.length > 8 && textRefBox.textRange.characters.length <= 15)
			{
				textRefBox.textRange.characterAttributes.horizontalScale = 75;
			}
			else if(textRefBox.textRange.characters.length > 15 && textRefBox.textRange.characters.length <= 20)
			{
				textRefBox.textRange.characterAttributes.horizontalScale = 55;
			}
			else if(textRefBox.textRange.characters.length > 20)
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
		if(template)
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
			catch(e)
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
		for(var l=0;l<layLen;l++)
		{
			thisLay = layers[l];
			try
			{
				thisLay.layers["Artwork Layer"].locked = false;
				thisLay.layers["Mockup"].locked = false;
				thisLay.layers["Information"].locked = true;
				thisLay.layers["Prepress"].visible = false;
			}
			catch(e)
			{
				log.l("Looks like this isn't a template layer. moving on.");
			}
		}
	}



	////////End//////////
	///Logic Container///
	/////////////////////

	/*****************************************************************************/

	///////Begin////////
	////Data Storage////
	////////////////////

	var library = 
	{
		undesirables : 
		{
			template :['jock tag b', 'thru-cut', 'info b', 'edge', 'cut line', 'cut', 'cutline', 'sewline', 'sew', 'sew line'],
			nonTemplate : ['process cyan', 'process magenta', 'process yellow', 'process black', 'cut line', 'cut', 'edge', 'edge1', 'edge2', 'deleted global color',//
											'deleted golbal color 1', 'deleted global color 2', 'deleted global color 3', 'deleted global color 4', 'deleted global color 5', //
											'thru-cut', 'sew line', 'sewline', 'info b', 'jock tag b']
		},

		lightSwatches : ["twitch b", "flo yellow b", "dark flesh b", "flesh b", "soft pink b", "vegas gold b", "optic yellow b", "yellow b", "lime green b", "white b", "gray b", "gray 2 b"],
		navyGray : 
		{
			navy : false,
			navy2 : false,
			gray : false,
			gray2 : false
		}
	}


	if(user == "will.dowling")
	{
		logDest.push(new File("~/Desktop/automation/javascript/logging/color_smasher_dev_log.txt"));
	}
	else
	{
		logDest.push(new File("/Volumes/Customization/Library/Scripts/Script Resources/Data/.script_logs/color_smasher_log.txt"))
	}

	////////End/////////
	////Data Storage////
	////////////////////

	/*****************************************************************************/

	///////Begin////////
	///Function Calls///
	////////////////////

	if(!valid)
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



	var template = isTemplate();

	var destLayer = getDest(template);

	var labelColor = getLabelColor();

	if(labelColor == null)
	{
		sendErrors(errorList);
		return;
	}

	//remove existing color chips if they already exist
	removeOldChips();


	//turn off printing for all layers
	setPrintable(false);

	//loop each artboard and generate chips for each individual artboard
	for(var a=0;a<artboards.length;a++)
	{
		inProgIndicator(true,a);

		if(template)
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
		duplicateArt(docRef.selection,inkLayer);

		var colors = generateInkList();

		if(colors == null)
		{
			sendErrors(errorList);
			return;
		}


		if(colors.length<1)
		{
			errorList.push("No Boombah colors were identified on artboard " + (a+1) + "...?");
		}


		makeColorChips(colors,artboards[a],destLayer);


		

		if(inkLayer != undefined)
			inkLayer.remove();
		inProgIndicator(false);
	}

	//turn on printing for all layers
	setPrintable(true);

	docRef.selection = null;

	if(errorList.length>0)
		sendErrors(errorList);

	printLog();

	////////End/////////
	///Function Calls///
	////////////////////

	/*****************************************************************************/

}
container();
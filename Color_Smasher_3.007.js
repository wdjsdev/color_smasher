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
		var valid = false;
		var result;
		try
		{
			scriptNotes.push("Info B did not exist. Created a new swatch.");
			var result = docRef.spots.add();
				result.name = "Info B";

				var thisColor = new CMYKColor();
				thisColor.cyan = 100;
				thisColor.magenta = 100;
				thisColor.yellow = 100;
				thisColor.black = 100;

				result.color = thisColor;
				result.colorType = ColorModel.SPOT;
				result.tint = 100;
				valid = true;
		}
		catch(e)
		{
			result = swatches["Info B"];
			valid = true;
		}

		if(valid)
			return result;
		else
		{
			errorList.push("Failed while setting 'Info B' color.\nTry manually adding the 'Info B' swatch to the document swatches panel and try again.\nOtherwise, please restart Illustrator.");
			return null;
		}
	}



	//isTemplate Function Description:
	//Check whether the activeDocument is a scriptable template
	//Checking for specific layer structure
	function isTemplate()
	{
		var template = false;
		for(var t=0;t<layers.length;t++)
		{
			if(layers[t].name.indexOf("FD")>-1)
			{
				template = true;
				break;
			}
		}
		return template;
	}



	//removeOldChips Function Description:
	//search for any existing color chips and remove
	//This function is executed at the beginning to ensure a clean slate
	function removeOldChips()
	{
		try
		{
			var theLayer = layers["BKGRD, do not unlock"];
		}
		catch(e)
		{
			//set theLayer to the bottom-most layer
			var theLayer = layers[layers.length-1];
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
	}



	//inProgIndicator Function Description:
	//Create/remove in progress indicator on the current artboard
	//This helps the artist know whether they need to continue undoing in the event of a runtime error.
	//When the artist executes enough undos, all indicators will be gone.
	function inProgIndicator(bool,index)
	{
		if(bool)
		{
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
			var txt = layers[0].textFrames["inProg"];
			txt.locked = false;
			txt.remove();
		}
	}



	//setPrinting Function Description
	//Set all document layers to: printable = bool; 
	//This allows for copying the artwork to the "inkLayer" to accurately generate the InkList.
	//Use setPrintable(true) to turn on printing for all layers.
	function setPrintable(bool)
	{
		for(var p=0;p<layers.length;p++)
		{
			layers[p].printable = bool;
		}
	}



	//existInkLayer Function Description:
	//check for the existence of an Ink Layer.
	//If one exists, delete it and create a new one to ensure a clean slate
	//Else Create one
	function existInkLayer()
	{
		var inkLayer;
		try
		{
			inkLayer = layers["Ink Layer"];
			inkLayer.remove();
			inkLayer = layers.add();
			inkLayer.name = "Ink Layer";
			inkLayer.printable = true;
		}
		catch(e)
		{
			inkLayer = layers.add();
			inkLayer.name = "Ink Layer";
			inkLayer.printable = true;
		}

		return inkLayer;
	}



	//duplicateArt Function Description:
	//duplicate selected artwork (all unlocked artwork on active artboard) to the Ink Layer
	function duplicateArt(sel,lay)
	{
		for(var d=0;d<sel.length;d++)
		{
			sel[d].duplicate(lay);
		}
	}



	//generateInkList Function Description:
	//push all non-undesirable inkList colors to array
	function generateInkList()
	{
		app.redraw();
		var inkList = docRef.inkList;
		var trueColors = [];

		if(template)
		{
			undesirable = library.undesirables.template;
		}
		else
		{
			undesirable = library.undesirables.nonTemplate;
		}
		for(var i=inkList.length-1;i>-1;i--)
		{
			var dontUse = false;
			var thisInk = inkList[i];
			if(thisInk.inkInfo.printingStatus == InkPrintStatus.DISABLEINK)
			{
				// inkList.splice(i,1);
				continue;
			}
			for(var u=0;u<undesirable.length;u++)
			{
				if(thisInk.name.toLowerCase() == undesirable[u])
				{
					// inkList.splice(i,1);
					dontUse = true;
					break;
				}
			}

			//this swatch is printable and is not undesirable
			if(!dontUse)
			{
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
			errorList.push("You have 'Navy B' AND 'Navy 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;

		}
		else if(library.navyGray.gray && library.navyGray.gray2)
		{
			errorList.push("You have 'Gray B' AND 'Gray 2 B' in your mockup. Please undo, merge them, and try again.");
			trueColors = null;
		}

		return trueColors;
	}



	//makeColorChips Function Description
	//take array of colors for the current artboard and create one color chip for each
	function makeColorChips(colors,aB,dest)
	{
		var x = aB.artboardRect[0] - 95;
		var y = aB.artboardRect[3] + 60;

		dest.locked = false;


		var chipGroup = dest.groupItems.add();
		chipGroup.name = "Swatches for Artboard " + (a+1);

		//loop each color and create a chip and label
		for(var m=colors.length-1;m>-1;m--)
		{
			var curSwatch = colors[m];
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
					tint = 100;
					break;
				}
			}

			// create the color chip and label

			//Create background box that holds the fill color of the chip.
			if(chipGroup.groupItems.length!=8)
				var colorBox = thisGroup.pathItems.rectangle(y,x+=100,100,20);
			else
			{
				x = aB.artboardRect[0] - 95;
				y = aB.artboardRect[3] + 40;
				var colorBox = thisGroup.pathItems.rectangle(y,x+=100,100,20);
			}
			if(curSwatch.indexOf("Process")>-1)
			{
				colorBox.filled = false;
				tint = 100;
			}
			else
			{
				colorBox.filled = true;
				colorBox.fillColor = swatches.getByName(curSwatch).color;
			}
			if(curSwatch != "White B")
			{
				colorBox.stroked = false;
			}
			else
			{
				colorBox.stroked = true;
				colorBox.strokeColor = labelColor.color;
				colorBox.strokeWidth = 0.3;
			}
			
			//Create a box to hold area text and a textFrame inside that box.
			var textBox = thisGroup.pathItems.rectangle(y-6,x+5,90,15); //no stroke/no fill container to hold the dimensions of the textFrame
			textBox.filled = false;
			textBox.stroked = false;
			var textRefBox = thisGroup.textFrames.areaText(textBox); //Text frame that holds the name of the swatch
			textRefBox.contents = curSwatch;
			textRefBox.textRange.fillColor = labelColor.color;
			textRefBox.textRange.fillColor.tint = tint;

		}
		dest.locked = true;
	}



	//getDest Function Description
	//Determine proper layer to place color chips on
	function getDest(template)
	{
		if(template)
		{
			var destLayer = layers["BKGRD, do not unlock"];
		}
		else
		{
			try
			{
				var destLayer = layers["Artboard Swatches"];
			}
			catch(e)
			{
				var destLayer = layers.add();
				destLayer.name = "Artboard Swatches";
				destLayer.zOrder(ZOrderMethod.SENDTOBACK);
			}
		}
		return destLayer;
	}



	//lockUnlockLayers Function Description
	//If the file is a template file, comb through layer structure and ensure
	//all layers are correctly locked or unlocked as required
	function lockUnlockLayers()
	{
		for(var L=0;L<layers.length;L++)
		{
			if(layers[L].name.indexOf("FD")>-1)
			{
				var thisLayer = layers[L];
				thisLayer.layers["Information"].locked = true;
				thisLayer.layers["Mockup"].locked = false;
				thisLayer.layers["Artwork Layer"].locked = false;
			}
			else if(layers[L].name == "Guides" || layers[L].name == "BKGRD, do not unlock")
			{
				layers[L].locked = true;
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

	////////End/////////
	////Data Storage////
	////////////////////

	/*****************************************************************************/

	///////Begin////////
	///Function Calls///
	////////////////////


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
			lockUnlockLayers();
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


	////////End/////////
	///Function Calls///
	////////////////////

	/*****************************************************************************/

}
container();
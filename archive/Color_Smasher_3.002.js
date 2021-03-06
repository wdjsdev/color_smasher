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
		alert("sendErrors" + e);
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
			result = swatches["Info B"];
			valid = true;
		}
		catch(e)
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
		for(var L=0;L<theLayer.groupItems.length;L++)
		{
			var curGroup = theLayer.groupItems[L];
			if(curGroup.name.indexOf("Swatches")>-1)
			{
				curGroup.remove();
			}
		}
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
			var thisInk = inkList[i];
			if(thisInk.inkInfo.printingStatus == InkPrintStatus.DISABLEINK)
			{
				inkList.splice(i,1);
				continue;
			}
			for(var u=0;u<undesirable.length;u++)
			{
				if(thisInk.name.toLowerCase() == undesirable[u])
				{
					$.writeln("removed " + thisInk.name);
					inkList.splice(i,1);
					break;
				}
			}

			//this swatch is printable and is not undesirable
			trueColors.push(inkList[i]);
		}
		return trueColors;
	}



	//makeColorChips Function Description
	//take array of colors for the current artboard and create one color chip for each
	function makeColorChips(colors,aB,dest)
	{
		var x = aB.artboardRect[0] - 95;
		var y = aB.artboardRect[3] + 60;

		var chipGroup = dest.groupItems.add();
		chipGroup.name = "Swatches for Artboard " + (a+1);

		//loop each color and create a chip and label
		for(var m=0;m<colors.length;m++)
		{
			var curSwatch = colors[m];

			//determine tint of label color
			for(var t=0;t<library.lightSwatches.length;t++)
			{

			}
		}
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

		lightSwatches : ["twitch b", "flo yellow b", "dark flesh b", "flesh b", "soft pink b", "vegas gold b", "optic yellow b", "yellow b", "lime green b", "white b"]
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

		var inkLayer = existInkLayer();

		//set activeArtboardIndex and select all artwork on that artboard
		docRef.selection = null;
		artboards.setActiveArtboardIndex(a);
		docRef.selectObjectsOnActiveArtboard();

		//duplicate all of the selected artwork to the Ink Layer
		duplicateArt(docRef.selection,inkLayer);

		var colors = generateInkList();

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

	if(errorList.length>0)
		sendErrors(errorList);


	////////End/////////
	///Function Calls///
	////////////////////

	/*****************************************************************************/

}
container();
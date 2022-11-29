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
function container ()
{

	var valid = true;
	var scriptName = "color_smasher";

	function getUtilities ()
	{
		//check for dev mode
		var devUtilitiesPreferenceFile = File( "~/Documents/script_preferences/dev_utilities.txt" );
		var devUtilPath = "~/Desktop/automation/utilities/";
		var devUtils = [ devUtilPath + "Utilities_Container.js", devUtilPath + "Batch_Framework.js" ];
		function readDevPref ( dp ) { dp.open( "r" ); var contents = dp.read() || ""; dp.close(); return contents; }
		if ( readDevPref( devUtilitiesPreferenceFile ).match( /true/i ) )
		{
			$.writeln( "///////\n////////\nUsing dev utilities\n///////\n////////" );
			return devUtils;
		}

		var utilNames = [ "Utilities_Container" ];

		//not dev mode, use network utilities
		var OS = $.os.match( "Windows" ) ? "pc" : "mac";
		var ad4 = ( OS == "pc" ? "//AD4/" : "/Volumes/" ) + "Customization/";
		var drsv = ( OS == "pc" ? "O:/" : "/Volumes/CustomizationDR/" );
		var ad4UtilsPath = ad4 + "Library/Scripts/Script_Resources/Data/";
		var drsvUtilsPath = drsv + "Library/Scripts/Script_Resources/Data/";

		var result = [];
		for ( var u = 0, util; u < utilNames.length; u++ )
		{
			util = utilNames[ u ];
			var ad4UtilPath = ad4UtilsPath + util + ".jsxbin";
			var ad4UtilFile = File( ad4UtilsPath );
			var drsvUtilPath = drsvUtilsPath + util + ".jsxbin"
			var drsvUtilFile = File( drsvUtilPath );
			if ( drsvUtilFile.exists )
			{
				result.push( drsvUtilPath );
			}
			else if ( ad4UtilFile.exists )
			{
				result.push( ad4UtilPath );
			}
			else
			{
				alert( "Could not find " + util + ".jsxbin\nPlease ensure you're connected to the appropriate Customization drive." );
				alert( "Using util path: " + drsvUtilsPath )
				valid = false;
			}
		}

		return result;

	}



	var utilities = getUtilities();




	for ( var u = 0, len = utilities.length; u < len && valid; u++ )
	{
		eval( "#include \"" + utilities[ u ] + "\"" );
	}


	if ( !valid ) return;

	logDest.push( getLogDest() );

	var smashTimer = new Stopwatch();
	smashTimer.logStart();

	DEV_LOGGING = true;




	/*****************************************************************************/

	///////Begin/////////
	///Logic Container///
	/////////////////////


	//sendErrors Function Description
	//Send an alert to the user describing the error that occurred
	function sendErrors ( e )
	{
		alert( e );
		return;
	}


	//getLabelColor Function Description:
	//Set global variable to the spot color "Info B"
	//If This color does not yet exist in the document swatches, create a new swatch
	function getLabelColor ()
	{
		log.l( "Getting labelColor." );
		var result = makeNewSpotColor( "Info B" );
		log.l( "labelColor = " + result );

		return result;
	}



	//removeOldChips Function Description:
	//search for any existing color chips and remove
	//This function is executed at the beginning to ensure a clean slate
	function removeOldChips ( layer )
	{
		var timerLabel = "removeOldChips-" + ( layer ? layer.name : "document" );
		smashTimer.beginTask( timerLabel );
		log.h( "Beginning execution of removeOldChips function." );
		var bkgrdLayer = findSpecificLayer( layers, "bkgrd", "any" );

		var artboardSwatchesLayer = findSpecificLayer( layers, "swatches", "any" );
		if ( artboardSwatchesLayer )
		{
			artboardSwatchesLayer.remove();
		}
		else if ( bkgrdLayer )
		{

			bkgrdLayer.locked = false;
			bkgrdLayer.visible = true;
			afc( bkgrdLayer, "groupItems" ).forEach( function ( item ) 
			{
				if ( item.name.match( /swatches/i ) )
				{
					item.remove();
				}
			} );
			bkgrdLayer.visible = false;
		}
		if ( layer )
		{
			layer.visible = true;
			layer.parent.visible = true;
			afc( layer, "groupItems" ).filter( function ( item )
			{
				return item.name.match( /swatches/i )
			} ).forEach( function ( item ) 
			{
				item.remove();
			} );
			layer.parent.visible = false;

		}

		smashTimer.endTask( timerLabel )

	}


	function isOverset ( frame )
	{
		if ( frame.kind == TextType.POINTTEXT )
		{
			return false;
		}
		if ( frame.lines.length == 1 && frame.paragraphs.length == 1 )
		{
			// single line
			if ( frame.lines[ 0 ].characters.length < frame.characters.length )
			{
				return true;
			}
			else
			{
				return false;
			}
		}
		else
		{
			// multiline

			var lineLength = frame.lines.length;
			var allContentArr = frame.contents.split( /[\x03\r\n]/g );
			var allContentReturnsLength = allContentArr.length;
			var lastLineContent = frame.lines[ lineLength - 1 ].contents;
			var lastAllContentContent = allContentArr[ allContentReturnsLength - 1 ];
			return !( allContentReturnsLength == lineLength && ( lastLineContent == lastAllContentContent ) );
		}
		return false;
	};

	function shrinkOversetText ( frame )
	{
		var fontShrinkPercentage = 2;
		var textShrinkAmt = ( fontShrinkPercentage / 100 ) * frame.textRange.characters[ 0 ].characterAttributes.horizontalScale;
		if ( isOverset( frame ) )
		{
			while ( isOverset( frame ) )
			{
				frame.textRange.characterAttributes.horizontalScale = frame.textRange.characterAttributes.horizontalScale - textShrinkAmt;
			}
		}
	};

	function makeChip ( color, chipGroup, pos, dim )
	{
		log.l( "Creating color chip for " + color );
		var curGroup = chipGroup.groupItems.add();
		var chip = curGroup.pathItems.rectangle( pos[ 1 ], pos[ 0 ], dim.width, dim.height );
		chip.fillColor = swatches[ color ].color;
		chip.strokeColor = labelColor.color;
		var areaTextBox = chip.duplicate();
		areaTextBox.resize( 90, 70 );
		var frame = curGroup.textFrames.areaText( areaTextBox );
		frame.contents = color;
		frame.textRange.characterAttributes.size = 14;
		frame.textRange.characterAttributes.stroked = false;
		frame.textRange.characterAttributes.fillColor = labelColor.color;
		frame.textRange.characterAttributes.fillColor.tint = library.lightSwatches.indexOf( color.toLowerCase() ) > -1 ? 100 : 0;
		frame.textRange.characterAttributes.baselineShift = -2
		shrinkOversetText( frame );
	}

	//makeColorChips Function Description
	//take array of colors for the current artboard and create one color chip for each
	function makeColorChips ( colors )
	{
		smashTimer.beginTask( "makeColorChips" );
		log.h( "Beginning execution of makeColorChips function." );
		log.l( "Adding colors: " + colors.join( ", " ) );

		var padding = 5; //padding between chips and edge of document

		//determine chip width. each chip should be 1/8th the width of the document - padding*2.
		var chipWidth = ( docRef.width - padding * 2 ) / 8;
		var chipHeight = 20;
		var chipDim = { width: chipWidth, height: chipHeight };
		var chipX = 0;
		var chipY = 0;


		var tmpLay = docRef.layers.add();
		tmpLay.name = "tmp";

		var chipGroup = tmpLay.groupItems.add();
		chipGroup.name = "Artboard Swatches";

		colors.sort().forEach( function ( color, index )
		{
			var pos = [ chipX, chipY ];
			makeChip( color, chipGroup, pos, chipDim );
			chipX += chipWidth;

			//if the next chip will go off the edge of the artboard, move it to the next row
			//8 swatches per row means index%7==0 means we're on the 8th swatch
			if ( index > 0 && index % 7 === 0 )
			{
				chipX = 0;
				chipY -= chipHeight;
			}
		} )

		var upFromBottom;
		var lay = artLayers[ 0 ];
		var mockLay = findSpecificLayer( lay, "mockup", "any" ) || lay;
		afc( docRef, "artboards" ).forEach( function ( ab )
		{
			var cg = chipGroup.duplicate( mockLay );
			var bounds = getBoundsData( ab );
			upFromBottom = bounds.height > bounds.width ? 60 : 50;
			cg.left = bounds.left + padding;
			cg.top = bounds.bottom + upFromBottom;
		} )

		tmpLay.remove();

		smashTimer.endTask( "makeColorChips" );

		return;
	}

	function preflightSwatches ()
	{
		var result = true;

		var dupSwatches = [];

		var dupSwatchPat = /[a-z\s]*b[\d]$/i
		var bSwatchPat = /^b[\d]{1,}$/i;

		for ( var x = 0; x < swatches.length; x++ )
		{
			if ( dupSwatchPat.test( swatches[ x ].name ) && !bSwatchPat.test( swatches[ x ].name ) )
			{
				dupSwatches.push( swatches[ x ].name );
			}
		}

		if ( dupSwatches.length )
		{
			result = false;
			alert( "Document contains the following colors that need to be merged:\n" + dupSwatches.join( "\n" ) );
		}

		if ( library.navyGray.navy && library.navyGray.navy2 )
		{
			log.e( "File contains Navy B and Navy 2 B." );
			errorList.push( "You have 'Navy B' AND 'Navy 2 B' in your mockup. Please undo, merge them, and try again." );
			trueColors = null;

		}

		if ( library.navyGray.gray && library.navyGray.gray2 )
		{
			log.e( "File contains Gray B and Gray 2 B." );
			errorList.push( "You have 'Gray B' AND 'Gray 2 B' in your mockup. Please undo, merge them, and try again." );
			trueColors = null;
		}

		if ( library.navyGray.charcoal && library.navyGray.charcoal2 )
		{
			log.e( "File contains Charcoal B and Charcoal 2 B." );
			errorList.push( "You have 'Charcoal B' AND 'Charcoal 2 B' in your mockup. Please undo, merge them, and try again." );
			trueColors = null;
		}
		return result;
	}

	function displayCheckBoombahLogoDialog ()
	{
		var imgIndex = getRandom( 1, 7 );
		var w = new Window( "dialog", "Make sure the Boombah logo is not hidden." );
		var img = UI.iconButton( w, resourcePath + "Images/look_closely/look_closely_" + imgIndex + ".jpg", function () { w.close() } );
		w.show();
	}

	function getItemColors ( item )
	{
		if ( item.typename.match( /compound/i ) )
		{
			if ( !item.pathItems.length )
			{
				item = cleanupCompoundPath( item );
			}
			item = item.pathItems[ 0 ];
		}

		if ( item.guides || ( !item.filled && !item.stroked ) )
		{
			item.remove();
			return;
		}

		var wrongColor = false;
		var curItemColors = [];

		[ "fill", "stroke" ].forEach( function ( prop )
		{
			var curProp = item[ prop + "Color" ];

			if ( !item[ prop.replace( /(e$)?/i, "" ) + "ed" ] )
			{
				return;
			}

			if ( curProp.typename.match( /gradient/i ) )
			{
				afc( curProp.gradient, "gradientStops" ).forEach( function ( stop )
				{
					curItemColors.push( stop.color );
				} );
			}
			else if ( curProp.typename.match( /pattern/i ) )
			{
				if ( usedPatternSwatchNames.indexOf( curProp.pattern.name ) < 0 )
				{
					usedPatternSwatchNames.push( curProp.pattern.name );
					usedPatternSwatches.push( curProp );
				}
			}
			else
			{
				curItemColors.push( curProp );
			}

			return;

		} );

		curItemColors.forEach( function ( curColor )
		{
			if ( curColor.spot )
			{
				var curName = curColor.spot.name;
				var lowName = curName.toLowerCase().replace( /\s*/g, "" );
				if ( !colorsUsed.indexOf( curName ) > -1 )
				{
					if ( prodColors.indexOf( lowName ) > -1 )
					{
						return;
					}
					else if ( goodSpotColors.indexOf( lowName ) > -1 )
					{
						colorsUsed.push( curName );
					}
					else
					{
						wrongColor = true;
					}
				}
			}
			else
			{
				log.l( "WrongColor: " + curColor.name );
				wrongColor = true;
			}
		} );


		if ( wrongColor )
		{
			item.duplicate( wrongColorLayer );
		}
	}

	function processPatternFills ( usedPatternSwatches )
	{
		smashTimer.beginTask( "processPatternFills" );
		log.h( "Processing pattern Fills: " + usedPatternSwatches.join( "," ) );
		var tmpPatternLay = docRef.layers.add();
		docRef.selection = null;
		usedPatternSwatches.forEach( function ( pswatch )
		{
			var rect = tmpPatternLay.pathItems.rectangle( 0, 0, 1, 1 );
			// rect.fillColor = swatches[ pswatch ].color;
			rect.fillColor = pswatch;
			rect.strokeColor = new NoColor();
			rect.selected = true;
		} );

		app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

		app.executeMenuCommand( "expandStyle" );
		app.executeMenuCommand( "Expand3" );

		app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;


		smashTimer.beginTask( "ungroupingExpandedPatterns" );
		afc( tmpPatternLay, "groupItems" ).forEach( function ( g )
		{
			//as far as i know, expanding a pattern fill will always result in a clip group
			//which consists of a rectangle as a clipping mask and an "art group" of the items
			//that comprise the pattern fill.
			//so ungroup that "art group" to the tmpPatternGroup for color checking
			ungroup( g.groupItems[ 0 ].groupItems[ 0 ], tmpPatternLay, 0 );
		} )
		smashTimer.endTask( "ungroupingExpandedPatterns" );


		smashTimer.beginTask( "getPatternColors" );
		//in theory... this layer should only contain the plain and simple artwork that comprises
		//each of the pattern fills that are used. so we can just check the colors of the items in this layer
		afc( tmpPatternLay, "pageItems" ).forEach( function ( p )
		{
			var path;
			if ( p.typename.match( /compound/i ) )
			{
				if ( !p.pathItems.length )
				{
					p = cleanupCompoundPath( p );
				}
				if ( !p )
				{
					p.remove();
					return;
				}
				path = p.pathItems[ 0 ] || p;
			}
			else if ( p.typename.match( /pathItem/i ) )
			{
				path = p;
			}
			else
			{
				return;
			}
			getItemColors( path );
		} );
		smashTimer.endTask( "getPatternColors" );

		tmpPatternLay.remove();

		smashTimer.endTask( "processPatternFills" );
	}

	function getCurArtboardIndex ( lay )
	{
		var abs = afc( docRef, "artboards" );
		var abMatches = {}; //{index: #, matches: #, 1:25}
		var cabIndex; //current artboard index
		if ( abs.length === 1 )
		{
			return 0;
		}

		afc( lay, "pageItems" ).forEach( function ( p )
		{
			abs.forEach( function ( ab, i )
			{
				var curAbName = ab.name;
				if ( isContainedWithinBuffer( p, ab, 50 ) )
				{
					if ( !abMatches[ curAbName ] )
					{
						abMatches[ curAbName ] = { index: i, matches: 1 };
					}
					else
					{
						abMatches[ curAbName ].matches++;
					}
				}
			} )
		} );

		var mostMatches = 0; //number of matches for a given artboard. just pick the artboard with the most matches.

		for ( var ab in abMatches )
		{
			if ( abMatches[ ab ].matches > mostMatches )
			{
				mostMatches = abMatches[ ab ].matches;
				cabIndex = abMatches[ ab ].index;
			}
		};

		cabIndex = cabIndex || 0;

		return cabIndex;
	}

	function extractArtworkFromMockup ( lay )
	{
		afc( lay, "pageItems" ).backForEach( function ( item )
		{
			if ( item.name.match( /notes|shadow/i ) || item.typename.match( /raster/i ) )
			{
				return;
			}

			item.duplicate( inkLayer );
		} );

		afc( lay, "layers" ).forEach( function ( subLay )
		{
			if ( subLay.name.match( /notes|shadow/i ) ) return;

			extractArtworkFromMockup( subLay );
		} )
	}

	function breakInkLayerSymbols ( lay )
	{
		smashTimer.beginTask( "breakInkLayerSymbols" );
		afc( docRef, "symbolItems" ).forEach( function ( s )
		{
			if ( s.layer === lay )
			{
				s.breakLink();
			}
		} )
		smashTimer.endTask( "breakInkLayerSymbols" );
	}

	function outlineTextFrames ( lay )
	{
		smashTimer.beginTask( "outlineTextFrames" );
		afc( docRef, "textFrames" ).forEach( function ( s )
		{
			if ( s.layer === lay )
			{
				s.createOutline();
			}
		} )
		smashTimer.endTask( "outlineTextFrames" );
	}

	function populateInkLayer ()
	{

		smashTimer.beginTask( "populateInkLayer" );

		//loop each layer in the document and if it's a template or a "mockup" layer,
		//then we'll check the colors of the artwork in that layer
		artLayers = afc( docRef, "layers" ).filter( function ( l )
		{
			return l.name.match( /([a-z]+[-_][\d]+)|(mockup)/i );
		} );

		log.l( "Getting artwork from layers::" + artLayers.map( function ( al ) { return al.name } ) );

		artLayers.forEach( function ( lay, i )
		{
			docIsTemplate = lay.name.match( /mockup/i ) ? false : true;

			var mockLayer = docIsTemplate ? findSpecificLayer( lay, "Mockup", "any" ) : lay;
			var artLayer = docIsTemplate ? findSpecificLayer( lay, "Artwork", "any" ) : lay;

			if ( !mockLayer )
			{
				errorList.push( "No mockup layer found in " + lay.name );
				errorList.push( "results may not be entirely accurate." );
				mockLayer = lay;
			}

			//find the artboard that corresponds to the current garment layer
			var curArtboardIndex = docIsTemplate ? getCurArtboardIndex( inkLayer ) : -1;

			removeOldChips( mockLayer );



			extractArtworkFromMockup( mockLayer );
			if ( artLayer )
			{
				extractArtworkFromMockup( artLayer );
			}
		} );

		smashTimer.endTask( "populateInkLayer" );
	}

	function getColorsFromInkLayer ()
	{
		smashTimer.beginTask( "getColorsFromInkLayer" );

		breakInkLayerSymbols( inkLayer );
		outlineTextFrames( inkLayer );

		//expand any apperances
		//we want only items with simple fill and stroke colors
		inkLayer.hasSelectedArtwork = true;
		app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

		app.executeMenuCommand( "expandStyle" );

		app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;


		smashTimer.beginTask( "ungroupInkLayer" );
		ungroup( inkLayer, inkLayer, 0 );
		smashTimer.endTask( "ungroupInkLayer" );


		smashTimer.beginTask( "getColorsFromInkLayer" );
		afc( inkLayer ).forEach( function ( item )
		{
			getItemColors( item );
		} );
		smashTimer.endTask( "getColorsFromInkLayer" );

		inkLayer.remove();
		inkLayer = docRef.layers.add();
		inkLayer.name = "Ink Layer";

		docRef.selection = null;
	}

	function getInkLayer ()
	{
		afc( docRef, "layers" ).forEach( function ( lay )
		{
			if ( lay.name.match( /ink|wrong/i ) )
			{
				lay.locked = false;
				lay.visible = true;
				lay.remove();
			}
		} )

		inkLayer = layers.add();
		inkLayer.name = "Ink Layer";

		wrongColorLayer = layers.add();
		wrongColorLayer.name = "Wrong Color Artwork";
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
		lightSwatches: [ "twitch b", "flo yellow b", "dark flesh b", "flesh b", "soft pink b", "vegas gold b", "optic yellow b", "yellow b", "lime green b", "white b", "gray b", "gray 2 b" ],
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

	if ( !valid )
	{
		return false;
	}

	smashTimer.beginTask( "initDocument" );

	//Global Variables
	var docRef = app.activeDocument;
	var layers = docRef.layers;
	var swatches = docRef.swatches;
	var artboards = docRef.artboards;
	var docIsTemplate = true; //default to true. if not a converted template, this will change to false
	var errorList = [];
	var scriptNotes = [];

	var colorsUsed = [];
	var usedPatternSwatches = [];
	var usedPatternSwatchNames = [];
	var artLayers = [];

	//make an array of all "good" colors
	//anything not in this list will be considered incorrect.
	var goodSpotColors = BOOMBAH_APPROVED_COLORS.map( function ( color ) { return color.toLowerCase().replace( /\s*/g, "" ) } );
	goodSpotColors = getUnique( goodSpotColors );

	var prodColors = BOOMBAH_PRODUCTION_COLORS.map( function ( color ) { return color.toLowerCase().replace( /\s*/g, "" ) } );


	if ( !preflightSwatches() )
	{
		return false;
	}

	var labelColor = getLabelColor();

	smashTimer.endTask( "initDocument" );

	if ( !user.match( /will\.dowling/i ) )
	{
		displayCheckBoombahLogoDialog();
	}

	docRef.selection = null;

	afc( docRef, "layers" ).forEach( function ( l ) { l.visible = l.locked = false } );

	var inkLayer, wrongColorLayer;
	getInkLayer();






	removeOldChips();
	populateInkLayer();
	getColorsFromInkLayer();

	//if there were any pattern fills,
	//draw a rectangle for each one and expand the object
	//then extract the fill colors from it and add them to
	//the colorsUsed array

	if ( usedPatternSwatches.length )
	{
		processPatternFills( usedPatternSwatches );
	}


	afc( docRef, "layers" ).forEach( function ( lay )
	{
		lay.visible = true;
		lay.locked = false;
		if ( lay.name.match( /bkgrd|guide/i ) )
		{
			lay.locked = true
		}
		else if ( lay.name.match( /ink.*layer/i ) )
		{
			lay.remove();
		}
		else if ( lay.name.match( /wrong/i ) )
		{
			lay.pageItems.length ? errorList.push( "Some artwork was found that was not using Boombah colors. It has been duplicated to a new layer called 'Wrong Color Artwork'." ) : wrongColorLayer.remove();;
		}
	} );


	//trim down the colorsUsed array to only unique values
	colorsUsed = getUnique( colorsUsed );


	docRef.selection = null;

	//create the color chips and place them at the bottom of each artboard.
	makeColorChips( colorsUsed );

	// docRef.save();

	if ( errorList.length > 0 )
	{
		sendErrors( errorList );
	}
	else
	{
		alert( "Consider your colors thoroughly SMASHED!" );
	}

	smashTimer.logEnd();
	log.l( "Color_Smasher took: " + ( smashTimer.calculate() / 60 ) + "seconds" );

	printLog();

	app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;


	////////End/////////
	///Function Calls///
	////////////////////

	/*****************************************************************************/

}
container();
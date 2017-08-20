# Flows Builder

An experimental GUI to build flows compiled into rules for the automation engine embedded in Eclipse SmartHome / openHAB 2.0.

![Screenshot](http://i.imgur.com/6tam9Hi.png)

**IMPORTANT: This app is experimental, and not part of Eclipse SmartHome or the official openHAB 2 distribution. Don't use the ESH or openHAB issue trackers for problems related to this app!**

## Getting started

* Drop the compiled .jar in your distribution's `addons` directory;
* Enable the experimental rule engine in Paper UI, _Addons > Misc_
* Launch Flows Builder from the dashboard
* Design your flow: drag and drop nodes from the toolbox on the left - add a trigger first, then conditions and actions; unlike simple rules, conditions might follow actions, and have an "else "path. Click on nodes and configure them as required in the right pane.
* Save it on the server with the save button (Ctrl+S or Meta+S work too) - give it a name if asked.
* Try to "build" your flow to check its validity by clicking the "Check" button or with the _Flow > Build only_ menu, if there is any error it will be reported in the build output pane. If successful, one or more rules will be built, **but not deployed yet to the rule engine** - this is your chance to review what's being done. You can click the small "View" link in the build output pane after a successful build to get the JSON output of the rules resulting from the compilation of your flow.
* Click the "Publish" button to deploy it to as rules or with the _Flow > Build and publish_ menu - if there are previous rules existing, they will be removed first.
* You can also unpublish the rules with the "unpublish" button or the _Flow > Unpublish_ menu

## Not supported

* Merged paths (and _a fortiori_ loops); this includes multi-trigger rules even though they're allowed by the engine
* Else path for conditions not in the core bundle - this implies knowing how to "negate" the conditions, which is hardcoded in the client for now (dirty hack to address)
* Undocumented features of the engine like rule templates, rule parameters etc.

## Missing features

- Check for dirtyness to avoid data loss if the flow is not saved, for instance when switching flows or closing the window
- Import from file or from an existing rule
- Snap to grid
- Duplicate, copy-paste nodes
- Undo/redo engine
- ...

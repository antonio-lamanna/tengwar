# TENGWAR

A static, client-side visual process modelling and documentation instrument.

## Architecture

1. **Information architecture:** one named project workspace, with multiple process flows as tabs, a component library, infinite canvas, one Inspector, Design/View modes, structural review and file exports. No project dashboard or account system.
2. **Data model:** a versioned project owns ordered flow documents and an active-flow ID. Each flow independently owns nodes, directed streams, document metadata and canvas settings. Geometry, identity and documented properties remain distinct. Browser storage holds only a local recovery copy.
3. **XML:** `<tengwar version="2.0"><project><diagrams><diagram>…</diagram></diagrams></project></tengwar>` saves every tab, project metadata and the active flow. Each diagram contains nodes and streams with immutable internal IDs, explicit port references and numeric geometry. Version 1.0 single-diagram XML is still accepted and wrapped as a one-flow project. Properties are typed XML entries. Extensible custom attributes and document metadata use JSON-typed entries inside XML. Import is atomic, with schema, type, ID, geometry and endpoint checks. Unknown schema versions and external entity declarations are rejected.
4. **Component taxonomy:** 73 schema-defined components across material, operation, equipment, logic, quality and documentation families. See `dist/modules/components.js`.
5. **Connectors:** four real anchors per connectable node, directed stream entities, orthogonal paths with rounded corners, six line semantics and editable routing coordinates. Ports stay attached after move and resize. Manual routing resolves congested layouts; automatic routing does not promise full obstacle avoidance.
6. **Validation:** 20 structural checks produce Error, Warning or Information findings with focus navigation. Passing indicates structural checks only. No scientific or regulatory validation is claimed. Optional ports are not treated as mandatory; missing operation inlets/outlets are checked semantically.
7. **UI:** direct workspace, collapsible left library and right Inspector, two editing modes, validation drawer, context menus, keyboard interaction, local recovery and export dialog. Small screens use mutually exclusive side panels.
8. **Visual system:** cool off-white and graphite, cobalt selection, muted technical typography, dot grid, hexagonal material endpoints and rectangular operation instruments. Dark mode has its own palette.

## Modules

- `model.js`: project/flow factories, demo data, project-wide transactional history and local recovery.
- `project-ui.js`: project creation/settings and flow-tab creation, naming, duplication, deletion and example loading.
- `components.js`: schema registry and technical icons.
- `canvas.js`: geometry, anchored routing and shared SVG rendering for canvas and export.
- `validation.js`: import contract and semantic structural checks.
- `io.js`: XML import/export, PNG/SVG export and local file adapter boundary.
- `app.js`: interface, Inspector and pointer/keyboard controllers.
- `webmcp.js`: optional, feature-detected tools for supported agent browsers.

## Run and deploy

Serve `dist/` with any static HTTP server. There are no package dependencies, build step, backend, database, API credentials or external font/image services. Native ES modules require serving over HTTP/HTTPS rather than opening index.html as a file URL.

`firebase.json` is ready for Firebase Hosting. Select the intended Firebase project before deploying. No Firebase Functions, Firestore or paid runtime services are involved. Sites publication is a separate review deployment; this repository does not create or overwrite a Firebase project.

## File behaviour

A new session starts with an empty Flow 1 in a blank project. Use New project in the project menu, New flow in the tab bar, and Load example to add the API process as another tab. Double-click a tab to rename it, or use its actions menu to rename, duplicate or delete it.

XML is the portable project format and includes every flow in tab order. PNG exports support 1×, 2× and 3× with a solid or transparent background; SVG remains vector. Both export renderers use the same node/connector geometry as the canvas. Exports exclude editor panels, selection handles and the dot grid. The diagram's current light/dark theme determines export colours.

Use Save project or Ctrl/Cmd S to export all flows in one XML. Local recovery is limited to this browser and origin. Importing a diagram replaces the local workspace and can be undone. Creating a new project offers saving and remains undoable. Loading an example adds a tab without replacing existing flows. Deleting a flow asks for confirmation and is undoable. Local recovery of a previous project remains enabled; a first-version workspace is preserved separately and can be recovered explicitly from the empty state or project menu. View mode locks modelling actions while allowing navigation and file export.

## Boundaries

This release documents processes; it performs no chemistry, simulation, mass balance, equipment execution or compliance assessment. The example is illustrative documentation, not a process recipe. Browser project import limits are 10 MB and 100 flows, with 1,000 components/3,000 streams per flow and 10,000 components/30,000 streams per project. PNG limits depend on browser canvas capacity; larger diagrams should use SVG. Direct folder access is deferred behind `localFileAdapter`.

## Verification

The retained core integration checks cover all 73 definitions, exact XML round-trip including escaped text and custom metadata, rejection of unsupported versions and invalid IDs/ports/geometry, reversible orientation, orthogonal anchored routes, structural findings, transactional undo/redo, and parseable SVG exports. The diagram SVG was rendered for label inspection. Interactive browser QA and browser-native PNG download were not exercised in this environment. Optional WebMCP registration was implemented with capability detection; no supported browser context was available for its integration verification.

The Node XML tests use `xml-js` as a test-only parser adapter from the runtime dependency directory. It is not shipped with the app.

### Project regression checks

The project checks additionally verify blank startup, independent flow properties and geometry, exact multi-flow XML restoration (including active tab), legacy XML conversion, duplicate-flow independence, deleting and undoing tabs, rejection of invalid inactive flows before replacement, and local recovery of the complete project. Canvas rendering now uses larger node titles, secondary labels and stream IDs; material nodes have a more compact default height. PNG and SVG export the active flow.

Create a prototype sharing application called 'protypic'.

This will be a tool that people can use to share vide coded prototypes to anyone. I bought a custom URL for this that I haven't set up yet (protypic.ai)

Requirements
- Users should be able to upload prototypes through an MCP server that can be added to any harness, or through a web portal
- Prototypes are frontend only. Upload can be a single HTML file, or a folder that contains HTML, CSS, JS, TS, TSX, etc. files. Anything frontend related
	- Prototypes should be functional when served through a CDN. No build steps or anything like that.
- Users should be able to select how long their prototype is live for
	- 1 day, 7 day, 30 day, 90 day, never expire
	- Once a prototype expires, it shoud no longer be accessible through the URL (404 page)
- Users should select if the prototype should be access code protected, or publicly visible (access code by default)
- When a prototype is uploaded, the user should be given a custom URL to access the prototype as well as an access code and expiration date (if applicable)
	- URL format: protypic.ai/p/{GUID}
	- Access code format: {GUID}
	- Expiration date
- Users should be able to manage their prototypes through an MCP server or web portal
	- View prototypes
	- Delete prototypes
	- Copy prototype link
	- copy prototype access code
- Prototype information included
	- Name
	- Creator
	- Link
	- Access code
	- Date created
	- Expire date
- When a user opens a prototype link, they must enter the access code before viewing (if required)


Architecture context
- I host all of my infra in GCP and would like to keep it that way
- Make the architecture as simple and flexible as possible. Easy to maintain and scalable
- The repo the code is stored in will be public so make sure no keys or anything are stored in it. Make sure the code is clean and presentable always!
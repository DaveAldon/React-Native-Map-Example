# React-Native-Map-Example
A component that displays a map with polylines built from routing from PCMiler

### About
The sample is focused on the map component. There is a lot more going on in the app this belongs to, but I've kept it simple to keep the sample small. I also didn't include my enum, theme, and analytics dependencies, for example. But they're used a few times in the sample. Otherwise, *the sample on its own won't work without a few more missing pieces (api keys, endpoints, etc)*.

To help with context, this component is used in an app by truck drivers to track their location automatically, and so that they can update their shipment, or see other useful information. The map portion routes a "semi truck" friendly path for the shipment, and uses PC Miler. Below is a screenshot (iPhone with notch) to illustrate the "Shipment Details" page this little map view goes in:

<img height="600" src="https://raw.githubusercontent.com/DaveAldon/React-Native-Map-Example/main/Screen%20Shot.png"/>

### Core Features
I was very glad to get the pathing drawn on the map, and have proper padding on a region. Supporting Android and iOS all in one solution was difficult when it came to padding: both platforms have been too inconsistent for me when using the mapPadding parameter of the MapView component. I wanted a single solution instead of separating my code based on platforms, so it was great to finally get proper padding on a region containing two points (lines 145, 189). 
 
Additionally, it was great get the route paths to draw via Polylines. After I get a reverse geocode location, PC Miler sends a pile of coordinates for a route. I piece these coordinates together and pass them to the MapView component. It's a very visual task, so it's cool to see them laid out on a native map, and style them (line 93, 154). When I first started working on this, my reverse geocode lookup was accidentally running every frame, so it was funny to watch the paths dance around because it was trying to recalculate the entire route every frame. I fixed this shortly after.
 
### Improvements
I would improve the api logic so that it's using an interface that makes it easier for a developer to work with, without needing to be as familiar with the code base. This would include a platform like OpenAPI, which I use for the app's main backend, but not yet for PC Miler. The sample code also has a lot of assumptions, and needs better error handling in case the data doesn't come back perfectly. Right now for example, if the block in line 73 fails, it just won't update the state, which could have unintended visual consequences that are confusing to the user. There could be retries placed in areas that make api calls in case the server simply timed out, or an actual error message to help diagnose the problem.
 
For future situations, I may have to drop the PC Miler platform. The reason I use it instead of Google maps is because Google charges a per-usage rate for reverse geocode lookups, whereas PC Miler is a flat rate. I use reverse geocode lookups a lot, and the app has 800+ active users, so it adds up. If PC Miler raised their rates and Google made its pricing better, I would have to switch, but that would require restructuring the code. The MapView uses Apple's native map for iOS, Apple Maps, so I'd need to switch it to Google maps across the board. Using Google's api means adding more libraries, and generating SHA1 keys for various dev/test/prod builds, among other changes. The logic generating the polylines depends on the PC Miler structure, and currently this isn't very dynamic.
 

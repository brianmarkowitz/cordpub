## cord-pub.js

A javascript library for making formated tables using data from Google sheets.  

## Requirements
- d3.js: http://d3js.org/d3.v3.js
- Google Visualization API: http://www.google.com/jsapi

## Usage

### Create table in Google Sheets
Sheet should have a header row with column labels and then rows of data.  See https://docs.google.com/spreadsheets/d/1hkE7P_fHrtiIFAx53xDyUl3gNOp4MSIYLrEwZIJWcaw as an example.


### Includes
Include d3 and google jsapi in the html header

```html
<script type="text/javascript" src="http://d3js.org/d3.v3.js" charset="utf-8"></script>
<script type="text/javascript" src="http://www.google.com/jsapi" charset="utf-8"></script>
<script type="text/javascript" src="cord-pub.js" charset="utf-8"></script>
```

### Initialize
#### Create templates json

```js
formats = {
            "Patent": '<div class="row"><div class="type_count col">[P%%Counter%%]</div><div class="citation col">%%Authors%%, %%Title%%, %%Misc_Description%%, %%Month%% %%Year%%.</div></div>',
            "Conference": '<div class="row"><div class="type_count col">[C%%Counter%%]</div><div class="citation col">%%Authors%%, "%%Title%%," in <i>Proc. %%Venue%%</i>, pp. %%Pages%%, %%Location%%, %%Month%% %%Year%%.<br>[<a href="https://scholar.google.com/scholar?cites=%%Google_ID%%">cites</a>]</div></div>',
            "Journal": '<div class="row"><div class="type_count col">[J%%Counter%%]</div><div class="citation col">%%Authors%%, "%%Title%%," <i>%%Venue%%</i>, vol. %%Volume%%, no. %%Number%%, pp. %%Pages%%, %%Month%% %%Year%%.<br>[<a href="https://scholar.google.com/scholar?cites=%%Google_ID%%">cites</a>]</div></div>',
            "Thesis": '<div class="row"><div class="type_count col">[T%%Counter%%]</div><div class="citation col">%%Authors%%, <i>%%Title%%</i>, %%Misc_Description%%, %%Month%% %%Year%%.</div></div>'
        };
```

#### Add div for each json key

```html
  <div id="Journal"></div>
  <div id="Conference"></div>
  <div id="Patent"></div>
  <div id="Thesis"></div>
```

#### Add div for author list and chord plot
```html
  <div id="chord_vis"></div>
  <div id="author_list"></div>
```

### Start cord-pub

```js
  cordpub.init(
      '1hkE7P_fHrtiIFAx53xDyUl3gNOp4MSIYLrEwZIJWcaw', // google sheets key
      formats, // json of templates
      "author_list", // div id of author list 
      "chord_vis", // div id of chors
      d3.scale.category20c() // d3 color scale or list of color strings
  );
```



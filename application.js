(function($, window, undefined){    

    function loadXMLString(txt) {
        if (window.DOMParser) {
            parser=new DOMParser();
            xmlDoc=parser.parseFromString(txt,"text/xml");
        } else {// Internet Explorer      
            xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async="false";
            xmlDoc.loadXML(txt); 
        }
        
        return xmlDoc;
    }


    var CurrencyManager = function() {       
        this.currency_data = [];

        this.update();

        this.assignColors();
    }   

    CurrencyManager.prototype.assignColors = function() {
        for (var i=0; i<CurrencyManager.currencies.length; i++) {
            // Asigning random color for each currency
            CurrencyManager.currencies[i].color = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
        }
    }

    CurrencyManager.currencies = [
        { id: "USD", name: "Американский доллар", alt_name: "Американского доллара" },          
        { id: "EUR", name: "Евро", alt_name: "Евро" }, 
        { id: "BGN", name: "Болгарский лев", alt_name: "Болгарского льва" },
        { id: "RUB", name: 'Российский рубль', alt_name: "Российского рубля" }, 
        { id: "JPY" },
        { id: "CZK" },
        { id: "DKK" },
        { id: "GBP" },
        { id: "HUF" },
        { id: "LTL" },
        { id: "LVL" },
        { id: "PLN" },
        { id: "RON" },
        { id: "SEK" },
        { id: "CHF" },
        { id: "NOK" },
        { id: "HRK" },
        { id: "TRY" },
        { id: "AUD" },
        { id: "BRL" },
        { id: "CAD" },
        { id: "CNY" },
        { id: "HKD" },
        { id: "IDR" },
        { id: "ILS" },
        { id: "INR" },
        { id: "KRW" },
        { id: "MXN" },
        { id: "MYR" },
        { id: "NZD" },
        { id: "PHP" },
        { id: "SGD" },
        { id: "THB" },
        { id: "ZAR" }
    ]

    CurrencyManager.prototype.get = function(currency) {
        for (var c=0; c<CurrencyManager.currencies.length; c++) {
            if (currency == CurrencyManager.currencies[c].id ) {
                return CurrencyManager.currencies[c];
            }
        }
    }    

    CurrencyManager.prototype.parseXML = function(xml) {
        var date, items, cur;
        var root = xml.childNodes[0].childNodes[2]; // Getting Root element for 'Cube' objects

        for (var i=0; i<root.childNodes.length; i++) {
            date = root.childNodes[i].attributes[0].value; // Time attribute <cube time='2011-03-24'>
            date = (new Date).setTime(Date.parse(date));
            
            items = {};
            
            for (var j=0; j<root.childNodes[i].childNodes.length; j++) {
                curr = root.childNodes[i].childNodes[j]; // <cube currency='RUB' rate='12.123' />

                items[curr.attributes[0].value] = parseFloat(curr.attributes[1].value);  // currs['RUB'] = '12.23'
            }

            items['EUR'] = 1.0;
    
            this.currency_data.push({ 'date': date, 'items': items });
        }

        return this.currency_data;
    }
    
    // TODO: Update currency using AJAX
    // Loading currencies from local file
    CurrencyManager.prototype.update = function() {
        return this.parseXML(loadXMLString(window.currency_xml));
    }
    
    // Get currency data relative to given base currency
    CurrencyManager.prototype.getData = function(base_currency) {
        var items, data = [];

        for (var i=0; i<this.currency_data.length; i++) {
            items = {};

            for (key in this.currency_data[i].items) {
                items[key] = this.currency_data[i].items[key] / this.currency_data[i].items[base_currency];
            }

            data.push({ 'date': this.currency_data[i].date, 'items': items });
        }
        

        return data;
    }

    
    var CurrencyUI = function(el){
        this.currency_manager = new CurrencyManager();

        this.points = 30.0;        

        this.initCanvas();
        this.initUI();
        
        this.draw();
    }

    CurrencyUI.prototype.initCanvas = function() {
        this._canvas_container = $('#right .cur_graph');

        this._canvas = document.createElement('canvas');
        this._ctx = this._canvas.getContext('2d');

        this._canvas.width = this._canvas_container.width();
        this._canvas.height = this._canvas_container.height();        

        this._canvas_container.append(this._canvas);
    }

    CurrencyUI.prototype.initUI = function() {
        var panel = "", options = "";
        
        for (var c=0; c<CurrencyManager.currencies.length; c++) {
            panel += ["<li>",
                         "<label>",
                             "<input type='checkbox' name='"+CurrencyManager.currencies[c].id+"'",
                             (c < 3 ? "checked" : ''), // Setting default checked values, only for Prototype
                             "/>",
                             CurrencyManager.currencies[c].name || CurrencyManager.currencies[c].id,
                         "</label>",
                       "</li>"].join('');

            
            options += ["<option value='" + CurrencyManager.currencies[c].id + "'>",
                            (CurrencyManager.currencies[c].alt_name || CurrencyManager.currencies[c].id).toLowerCase(),
                        "</option>"].join('');                        
        }

        $('#left ol').html(panel);
        $('#left ol li input').bind('change', $.proxy(this.draw, this));

        $('#header select').html(options)
            .val('RUB') // Setting default values
            .bind('change', $.proxy(this.draw, this));

        $('#left a.show_all').bind('click', function(){
            $('#left ol').css({ width: '100%', overflow:'visible' });

            $(this).remove();
        });
    }

    CurrencyUI.prototype.draw = function() {
        var currencies = $('#left ol li input:checked');
        for (var i=0; i<currencies.length; i++) {
            currencies[i] = currencies[i].name;
        }

        var base_currency = $('#header .base_currency').val();

        var currency_data = this.currency_manager.getData(base_currency);        
                
        currencies.sort(function(c1, c2){
            return currency_data[0].items[c1] - currency_data[0].items[c2];
        });

        var max, min, rate;
        
        for (var c=0; c<currencies.length; c++) {
            for (var p=0; p<this.points; p++) {
                rate = 1/currency_data[p].items[currencies[c]];
                rate = rate * 10000; // Scaling to make it look more smoothly

                if (max == undefined || rate > max) {
                    max = rate;
                }

                if (min == undefined || rate < min) {
                    min = rate; 
                }
            }
        }
        
        var range = (max-min);  

        var x,y;

        // Clear Labels
        this._canvas_container.find('.legend').remove();

        // Clear Canvas
        this._canvas.width = this._canvas.width;
        this._ctx.clearRect(0,0, this._canvas.width, this._canvas.height);

        if (!currencies.length)
            return;
        
        this._ctx.save(); 

        // More vertical space
        this._ctx.scale(1, 0.9); 
        
        // Scaling canvas to fit selected region
        var scale = this._canvas.height/range;
        this._ctx.scale(1, scale); 
        
        // Flip canvas horizontaly
        this._ctx.scale(1, -1);
        this._ctx.translate(0, -max-range*0.01);        
            
        // This fixes lineWidth problem described here https://developer.mozilla.org/En/Canvas_tutorial/Applying_styles_and_colors#A_lineWidth_example
        this._ctx.lineWidth = 1/scale; 

        if (this._ctx.lineWidth > 1) {
            this._ctx.lineWidth = 1; 
        }

        this._ctx.lineJoin = 'round';
        this._ctx.lineCap = 'round';

        for (var c=0; c<currencies.length; c++) {
            this._ctx.beginPath();
            
            for (var p=0; p<=this.points; p++) {
                x = (this._canvas.width/this.points)*p;

                y = 1/currency_data[p].items[currencies[c]];

                y = y*10000; // Scaling to make it look more smoothly
                
                this._ctx.lineTo(x,y); 
            }            
           
            this._ctx.globalAlpha = 1;                    

            this._ctx.strokeStyle = this.currency_manager.get(currencies[c]).color;
            this._ctx.stroke();

            this._ctx.lineTo(x, -max);
            this._ctx.lineTo(0, -max);

            this._ctx.closePath();
            
            this._ctx.globalAlpha = 0.3;

            this._ctx.fillStyle = this.currency_manager.get(currencies[c]).color
            this._ctx.fill();

            this.drawLegend(currencies[c], x, y, range, max, min);
        }
        
        this._ctx.restore();
    }

    CurrencyUI.prototype.drawLegend = function(currency, x, y, range, max, min) {
        // Gettig y coord relative to canvas
        var legend_y = (y-min)/range*this._canvas.height;
        legend_y = legend_y*0.9;

        var legend = $('<a class="legend">'+currency+'</a>');
        legend.css({
            top: (250-legend_y)+'px'            
        });

        this._canvas_container.append(legend);
    }

    $(function(){
        new CurrencyUI();
    });

    window.curr_manager = new CurrencyManager();
}(jQuery, window))

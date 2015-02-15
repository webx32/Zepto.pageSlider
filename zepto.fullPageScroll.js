;(function( $, window ){
    if( typeof $ == "undefined" ){
        throw new Error("Zepto not found!");
    }

    //common functions
    var emptyFunction = function(){};
    var doAnimation = ( window.requestAnimationFrame || function(callback){ callback(); } );
    var easingAdd = function( $el,time,easing ){
        var time = ( time || "400" ) + "ms",
            easing = easing || "ease",
            prop = [ "all",time,easing ].join(" ");

        $el.css({
            "-webkit-transition": prop,
                    "transition": prop
        });
    };
    var easingRemove = function( $el ){
        $el.css({
            "-webkit-transition": "none",
                    "transition": "none"
        });
    };

    //FullPageScroll
    var FullPageScroll = function( $ctn, config ){
        this.$ctn = $ctn;
        this.config = config;
        this.timeId = 0;

        //取得pages 只取最近一层的元素
        $p1 = $ctn.find( config.pageSelector ).eq(0);
        this.$pages = $p1.add( $p1.siblings( config.pageSelector ) );
    };

    //初始化
    FullPageScroll.prototype.init = function(){
        var $parent = this.$ctn.offsetParent(),  //父级
            $ctnInner = $( "<div class='full-page-scroll-inner' />" ), //创建一个inner层用来移动
            ctnHeight = this.config.height, //容器高
            ctnWidth = this.config.width, //容器宽
            pageLen = this.$pages.length,
            curPage = 0, //当前页码
            pagePercent = 100 / pageLen; //每页所占百分比

        if( !ctnHeight ){
            ctnHeight = $( window ).height();
        }
        if( !ctnWidth ){
            ctnWidth = $( window ).width();
        }
        if( !isNaN(ctnHeight) ){
            ctnHeight = ctnHeight + "px";
        }
        if( !isNaN(ctnWidth) ){
            ctnWidth = ctnWidth + "px";
        }

        this.$ctnInner = $ctnInner;
        this.pageLen = pageLen;
        this.curPage = curPage;
        this.pagePercent = pagePercent;

        //容器 DOM 设定
        this.$ctn.css({
            "position": "relative",
            "width":    ctnWidth,
            "height":   ctnHeight,
            "overflow": "hidden"
        });
        //容器宽高可能为%，重获取
        ctnHeight = this.$ctn.height();
        ctnWidth = this.$ctn.width();
        this.ctnHeight = ctnHeight;
        this.ctnWidth = ctnWidth;

        //移动层 DOM 设定
        var innerProp = {
            "position": "absolute",
            "top":      0,
            "left":     0,
            "width":    "100%",
            "height":   pageLen  + "00%",
            "overflow": "hidden"
        }; 
        //page DOM 设定
        var pageProp = {
                "position": "relative",
                "display":  "block"
        };
        //extenal page css
        for( var i in this.config.pageCss ){
            if( !pageProp.hasOwnProperty(i) ){
                pageProp[i] = this.config.pageCss[i];
            }
        }

        if( this.config.horizontal ){
            //横版
            innerProp["width"] = pageLen  + "00%";
            innerProp["height"] = "100%";

            pageProp["float"] = "left";
            pageProp["height"] = "100%";
            pageProp["width"] =  pagePercent + "%";
        }else{
            innerProp["width"] = "100%";
            innerProp["height"] = pageLen  + "00%";

            pageProp["height"] =  pagePercent + "%";
            pageProp["width"] = "100%";
        }

        //DOM CSS 赋值
        $ctnInner.css( innerProp );
        easingAdd( $ctnInner, this.config.easingTime, this.config.easing );
        this.$pages.wrapAll( $ctnInner ).each(function(){
            $(this).css(pageProp);
        });

        this.eventBind();
    };

    //事件绑定
    FullPageScroll.prototype.eventBind = function(){
        var that = this,
            ref = ( this.config.horizontal ? 'clientX' : 'clientY' ),
            area = ( this.config.horizontal ? this.ctnWidth : this.ctnHeight ),
            tStart,
            tAmount,
            amountPercent,
            ctnAmountPercent;

        this.$ctn.on("touchstart",function(e){
            e.preventDefault();
            tStart = e.touches[0][ ref ];
            easingRemove( that.$ctnInner );

        });
        this.$ctn.on("touchmove",function(e){
            e.preventDefault();
            e.stopPropagation();
            tAmount = e.changedTouches[0][ ref ] - tStart;
            //对于ctn的位移比例
            ctnAmountPercent = tAmount/area * 100;
            //移动使用对于放大后的ctnInner的位移比例
            amountPercent = -1 * that.curPage * that.pagePercent + ctnAmountPercent/that.pageLen;
            that.innerMove( amountPercent );
        });
        this.$ctn.on("touchend touchcancel",function(e){
            e.preventDefault();
            easingAdd( that.$ctnInner, that.config.easingTime, that.config.easing );
            if( ctnAmountPercent >= that.config.percentThreshold ){
                that.movePrev();
            }else if( ctnAmountPercent <= -1 * that.config.percentThreshold ){
                that.moveNext();
            }else{
                that.moveReset();
            }

            tStart = 0;
            tAmount = 0;
            amountPercent = 0;
            ctnAmountPercent = 0;
        });
    };

    //移到下一个
    FullPageScroll.prototype.moveNext = function(){
        var curPage = this.curPage,
            nextPage = curPage + 1;

        if( nextPage > this.pageLen-1 ){
            if( this.config.loop ){
                nextPage = 0;
            }else{
                return this.moveReset();
            }
        }

        this.moveTo( nextPage );
    };

    //移到前一个
    FullPageScroll.prototype.movePrev = function(){
        var curPage = this.curPage,
            prevPage = curPage - 1;

        if( prevPage < 0 ){
            if( this.config.loop ){
                prevPage = this.pageLen - 1;
            }else{
                return this.moveReset();
            }
        }

        this.moveTo( prevPage );
    };

    //移动到某一个page
    FullPageScroll.prototype.moveTo = function( index ){
        var that = this,
            amountPercent;

        if( index < 0 || index > this.pageLen - 1 ){
            return false;
        }

        //beforeMove
        if( typeof this.config.beforeMove == "function" ){
            that.config.beforeMove(this.$pages[index], index);
        }

        amountPercent = ( -1 * index * ( 100 / this.pageLen ) ) || 0;//不要-0
        this.innerMove( amountPercent );
        this.curPage = index;
        
        //afterMove
        if( typeof this.config.afterMove == "function" ){
            window.clearTimeout( this.timeId );
            this.timeId = window.setTimeout(function(){
                that.config.afterMove(that.$pages[index], index);
            },this.config.easingTime);
        }
    };

    //复位移动
    FullPageScroll.prototype.moveReset = function(){
        var amountPercent = ( -1 * this.curPage * ( 100 / this.pageLen ) ) || 0;

        this.innerMove( amountPercent );
    };

    //位移操作
    FullPageScroll.prototype.innerMove = function( amount ){
        var that = this,
            translate = ( this.config.horizontal ?
                "translate3d(" + amount + "%, 0, 0)" :
                "translate3d(0, " + amount + "%, 0)" );

        doAnimation(function(){
            that.$ctnInner.css({
                "-webkit-transform":translate,
                        "transform":translate
            });
        });

    };

    var defaults = {
        pageSelector: ".page",
        height:     null,   //默认为视口高。可传入百分比（按父级高度百分比）,或px
        width:      null,   //默认为视口高。可传入百分比（按父级高度百分比）,或px
        horizontal: false,  //默认为竖直排布scroll，可以水平
        autoSpeed:  5000,   //自动播放速度
        auto:       false,  //是否自动播放
        loop:       true,     //是否循环播放
        percentThreshold: 10, //拉动超过百分比时翻页
        easing:     'ease-out',   //缓动函数 加在transition里
        easingTime: '400',      //缓动延迟
        pageCss:    {},         //page额外的css(不接受height,width,会被覆盖)

        //TODO: prev, next

        beforeMove: emptyFunction,
        afterMove:  emptyFunction
    };

    //fn extend
    $.fn.fullPageScroll = function( parameters ){
        var config = $.extend( true, {}, defaults, parameters );

        return this.each(function( idx, el ){
            //实例化FullPageScroll
            var $el = $(el);
            var instance = new FullPageScroll( $el, config );
            instance.init();
        });
    };

}( window.Zepto, window ));


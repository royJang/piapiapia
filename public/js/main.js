'use strict';

var fs = require("fs");
var $ = require("jquery");
var request = require("request");
var cheerio = require("cheerio");

var gui = require('nw.gui');
var clipboard = gui.Clipboard.get();

var wrapper = $(".content");
var url = wrapper.find(".tUrl"),
    step = wrapper.find(".tStep"),
    total = wrapper.find('.tTotal'),
    content = wrapper.find('.tContent'),
    otherLayer = wrapper.find(".otherLayer"),
    submit = wrapper.find(".submit"),
    generatorImage = wrapper.find(".generatorImage");
var searchResult = $(".search-result");
var progress = $(".progress");
var progressBar = progress.find(".progressBar");
var progressPercent = progress.find(".progressPercent");

var memberInfo = [];
var page = 1;
var lwzy = [];
var TOTAL;

var warn = wrapper.find(".warn"),
    warning = function (str){
        warn.html(str);
    };

var isEmptyObject = function( obj ) {
    var name;
    for ( name in obj ) {
        return false;
    }
    return true;
}


$(function (){
    $("body").bind("keydown", function (e){
        var $ctrl = e.ctrlKey || e.metaKey;
        if($ctrl){
            switch (e.which){
                case 86 : {
                    var s = window.getSelection().toString();   //当前选择的文字
                    var text = clipboard.get('text');
                    var $v = $(e.target).val();
                    if(s.length > 0){
                        var n = $v.replace(s, text);
                        $(e.target).val(n);
                    }else{
                        $(e.target).val($v + text);
                    }
                    break;
                }
                case 65 : {
                    $(e.target).select();
                    break;
                }
                case 67 :                 {
                    var str = window.getSelection().toString();
                    clipboard.set(str, 'text');
                    break;
                }
            }
        }
    });

    submit.on("click", function (){

        var $url = url.val(),
            $step = Math.ceil(step.val()),
            $total = Math.ceil(total.val()),
            $content = content.val();

        if( !url.val() ){
            warning("填网址啊，傻x!");
            return;
        }
        if(
            !$step  || $step < 1 || typeof $step != "number" ||
            !$total || $total < 1 || typeof $total != "number"
        ){
            warning("楼层填的不对！");
            return;
        }

        warning("查询中...");
        progress.show();
        submit.attr("disabled",true);
        searchResult.html("");

        var __r__ = [];
        var otl = otherLayer.val().length > 0 ? otherLayer.val().split(",") : [];
        otl.forEach(function (el){
            __r__.push(Math.ceil(el));
        });

        TOTAL = (__r__.length + $total);

        getMemberInfo($url, {
            step : $step,
            total : $total,
            content : $content,
            otl : __r__,
        }, function (chunk, lw){

            //原有基础上＋1
            var r = [];
            lw.forEach(function (el){
                r.push(el + 1);
            })

            warning("没有匹配到的楼层进行顺延一位并二次查询..");
            //重新计算total
            TOTAL = r.length;

            getMemberInfo($url, {
                content : $content,
                otl : r
            }, function (data, lwzy){
                var arr = [];

                var $d = data.concat(chunk);

                $d.forEach(function (el,i){
                    if(!isEmptyObject(el)) {
                        var $c = (el.content ? decodeURIComponent(el.content) : "[图片]");
                        var $content = ($c.length > 20 ? ($c.slice(0, 20) + "...") : $c);

                        arr.push(
                            "<li>" +
                            "<dl>" +
                            "<dd>姓名：<span class='mName'>" + el.name + "</span></dd>" +
                            "<dd>楼层：" + el.floor + "</dd>" +
                            "<dd>等级：" + (el.level || 0) + "</dd>" +
                            "<dd>性别：" + (el.sex == 1 ? "高富帅" : "白富美") + "</dd>" +
                            "<dd>平台：" + (el.platform || "网页版" ) + "</dd>" +
                            "<dd>内容：" + $content + "</dd>" +
                            '</dl>' +
                            "</li>"
                        )
                    }
                });

                searchResult.html(arr.join(""));
                submit.attr("disabled",false);
                warning(
                    "统计完毕" +
                    (
                        r.length > 0
                            ? ',［' + r + '］楼 顺延一位' +
                                (
                                    lwzy.length > 0
                                        ? ",其中［" + lwzy.join(",") + "］楼被吞"
                                        : ""
                                )
                            : ""
                    )
                );
                progress.hide();
                progressBar.css("width",0);
                progressPercent.html("0%");
            })
        });
    });

    generatorImage.on("click", function (){
        //先使用canvas截图
        //然后通过toDataURL转换为一个图片
        //将图片base64头去掉
        //将base64专为一个base64格式的buffer
        //创建一个p-xxx.png的零时图片
        //buffer写入图片
        //写入完毕创建一个a标签,下载图片
        html2canvas(searchResult).then(function(canvas) {
            var $p = canvas.toDataURL("image/png");
            var base64Data = $p.replace(/^data:image\/\w+;base64,/, "");
            var buff = new Buffer(base64Data,'base64');
            var f = "p-" + (new Date() - 0) + '.png';
            fs.writeFile(f, buff, function (err){
                var a = document.createElement("a");
                a.href = f;
                a.download = "biubiubiu.png";
                a.click();
            });
        });
    });

    function  getMemberInfo (url, options, callback){

        var step = Math.ceil(options.step || 0);
        var total = Math.ceil(options.total || 0);
        var _otl = options.otl || [];
        var postContent = options.content && encodeURIComponent(options.content);
        var r = [];
        //先将有规律的数字遍历出来
        for(var i=1;i<=total;i++){
            r.push(i * step);
        }
        //然后将规律外的数字并进来
        r = r.concat(_otl);

        //然后排一下顺序
        r.sort(function (x,y){
            return x-y;
        });

        //clone一个数组，用来做对比的
        var clone_r = r.concat();

        //爬取百度数据
        request(url, function (err,res,body){
            if(err){
                console.log("biubiubiu:" + err);
                return callback(memberInfo);
            }
            var $ = cheerio.load(body);
            var max = 1;
            var a = $(".l_pager").children().last();
            if( a.text() == "尾页" ){
                //当前最大页数
                max = a.attr("href").match(/\?pn=(\w+)/)[1]
            }

            var l_post = $("#j_p_postlist").find(".l_post"),
                l_post_len = l_post.length;

            //爬下来的数据
            l_post.each(function (i,el){
                var $el = JSON.parse($(el).attr('data-field')),
                    author = $el["author"],
                    layer = $el["content"];

                var name = author.user_name,
                    sex = author.user_sex,
                    level = author.level_id,
                    floor = layer.post_no,
                    platform = layer.open_type,
                    post_id = layer.post_id,
                    post_content = encodeURIComponent($("#post_content_" + post_id).text().replace(/(\s+)?/g,""));

                //在请求楼层中查找当前循环到的楼层
                var _rio = r.indexOf(floor);

                if( _rio > -1
                    && (post_content.length > 0 ? (post_content.indexOf(postContent) > -1) : true)
                ){
                    //查一下在哪～
                    var $rio = clone_r.indexOf(floor);
                    //匹配到的数字从数组中删去
                    clone_r.splice($rio,1);
                    //member info
                    memberInfo.push({
                        name : name,
                        sex : sex,
                        level : level,
                        floor : floor,
                        platform : platform,
                        content : post_content
                    });
                }

                //小于一页最后一位且没查到的都push一个空对象进度
                if(i == l_post_len - 1){
                    clone_r.forEach(function(els,j){
                        //当一页查询完，小于最大floor的都应该被视为没有查询到的
                        //删除掉他们
                        //然后给memberInfo赋一个空对象
                        if(els < floor){
                            lwzy.push(clone_r[j]);
                            clone_r.splice(j,1);
                            memberInfo.push({});
                        }
                    })
                }
            })

            page += 1;

            var memberInfoLength = 0;
            memberInfo.forEach(function (el, i){
                if(!isEmptyObject(el)){
                    memberInfoLength += 1;
                }
            })

            var $percent = Math.ceil((memberInfoLength/ TOTAL) * 100) + "%";
            progressPercent.html($percent);
            progressBar.css("width", $percent);

            if((page < max) && (memberInfo.length < TOTAL)){
                getMemberInfo(url.replace(/(\?pn=\d+)?/gi,"") + "?pn=" + page, {
                    content : postContent,
                    otl : clone_r
                }, callback);
            }else{
                callback(memberInfo, lwzy);
                memberInfo = [];
                memberInfo.length = 0;
                lwzy = [];
                lwzy.length = 0;
                page = 1;
                return;
            }
        });
    };
})
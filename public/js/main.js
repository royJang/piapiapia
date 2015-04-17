var $ = require("jquery");
var request = require("request");
var cheerio = require("cheerio");
var async = require("async");

var gui = require('nw.gui');
var clipboard = gui.Clipboard.get();

var wrapper = $(".content");
var url = wrapper.find(".tUrl"),
    step = wrapper.find(".tStep"),
    total = wrapper.find('.tTotal'),
    content = wrapper.find('.tContent'),
    submit = wrapper.find(".submit");
var searchResult = $(".search-result");
var progress = $(".progress");
var progressBar = progress.find(".progressBar");
var progressPercent = progress.find(".progressPercent");

var memberInfo = [];
var page = 1;

var warn = wrapper.find(".warn"),
    warning = function (str){
        warn.html(str);
    };


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

        warning("开始统计...");
        progress.show();
        submit.attr("disabled",true);
        searchResult.html("");
        getMemberInfo($url, {
            step : $step,
            total : $total,
            content : $content
        }, function (data){
            var arr = [];
            data.forEach(function (el,i){
                arr.push(
                    "<li>" +
                    "<dl>" +
                    "<dd>姓名：" + el.name + "</dd>" +
                    "<dd>楼层：" + el.floor + "</dd>" +
                    "<dd>等级：" + el.level + "</dd>" +
                    "<dd>性别：" + (el.sex == 1 ? "汉子" : "妹子") + "</dd>" +
                    "<dd>平台：" + (el.platform) + "</dd>" +
                    "<dd>内容：" + (el.content ? decodeURIComponent(el.content) : "啥都没说～") + "</dd>" +
                    '</dl>' +
                    "</li>"
                )
            });

            searchResult.html(arr.join(""));
            submit.attr("disabled",false);
            warning("统计完毕");
            progress.hide();
            progressBar.css("width",0);
            progressPercent.html("0%");
        });
    });

    function  getMemberInfo (url, options, callback){

        var step = Math.ceil(options.step);
        var total = Math.ceil(options.total);
        var postContent = options.content && encodeURIComponent(options.content);

        request(url, function (err,res,body){
            if(err){
                console.log(err);
                return callback(memberInfo);
            }
            var $ = cheerio.load(body);
            var max = 1;
            var a = $(".l_pager").children().last();
            if( a.text() == "尾页" ){
                max = a.attr("href").match(/\?pn=(\w+)/)[1]
            }
            $("#j_p_postlist").find(".l_post").each(function (i,el){
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

                if( step && total ){  //有规律的
                    if( floor % step == 0
                        && floor >= step
                        && (post_content.length > 0 ? post_content.indexOf(postContent) > -1 : true )
                        && memberInfo.length < total
                    ){
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
                }
            })

            page += 1;
            var $percent = Math.ceil((memberInfo.length/total) * 100) + "%";
            progressPercent.html($percent);
            progressBar.css("width", $percent);

            if( (page < max) && (memberInfo.length < total) ){
                getMemberInfo(url.replace(/(\?pn=\d+)?/gi,"") + "?pn=" + page, options, callback);
            }else{
                callback(memberInfo);
                memberInfo = [];
                memberInfo.length = 0;
                page = 1;
                return;
            }
        });
    };
})
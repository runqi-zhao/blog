---
slug: Spring-注解之-RestController与-Controller的区别
title: Spring-注解之-RestController与-Controller的区别
author: Runqi Zhao
author_title: Backend Developer
author_url: https://github.com/runqi-zhao
author_image_url: https://github.com/runqi-zhao.png
tags: [java]
---

<!-- truncate -->



　开发RESTful API 时，一般都会在Controller上加上@Controller注解，但是有时候加上@RestController，当同事问为什么的时候，我也一脸懵逼，默默的看了资料，现在就说说他们的区别。

　　@RestController注解等价于@ResponseBody ＋ @Controller。@RestController和@Controller的共同点是都用来表示Spring某个类是否可以接收HTTP请求，**二者区别： @RestController无法返回指定页面，而@Controller可以**；前者可以直接返回数据，后者需要@ResponseBody辅助。下面详细分析*。*

**① 是否可以返回页面**

　　答：@RestController无法返回指定页面，而@Controller可以。
　　解析：对于Controller， 如果只是使用@RestController注解，则其方法无法返回指定页面，此时配置的视图解析器 InternalResourceViewResolver不起作用，返回的内容就是 return 里的内容。 如果需要返回到指定页面，则需要用 @Controller配合视图解析器InternalResourceViewResolver才行。
**② 返回内容**
　　如果需要返回JSON，XML或自定义mediaType内容到页面，@RestController自己就可以搞定,这个注解对于返回数据比较方便，因为它会自动将对象实体转换为JSON格式。而@Controller需要在对应的方法加上@ResponseBody注解。

示例：

```java
import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/difference")
public class DifferenceController {

    // 跳转到上传文件的页面
    @RequestMapping(value = "/goToSuccessPage", method = RequestMethod.GET)
    public String goToSuccessPage() {
        // 跳转到 视图层 success.html失败
        return "success";
    }

    @RequestMapping(value = "findAll", method = RequestMethod.GET)
    public Map<String, String> findAll() {
        Map<String, String> all = new HashMap<>();
        all.put("remark", "可以返回json，xml或自定义mediaType内容到页面");
        return all;
    }
}
```

```java
@Controller
@RequestMapping("/login")
public class LoginController {


    @GetMapping(value = "/login")
    public String login() {
        // 跳转到 视图层 login.html
        return "login";
    }
    @RequestMapping(value = "/getJson", method = RequestMethod.GET)
    @ResponseBody
    public Map<String, String> getJson() {
        Map<String, String> all = new HashMap<>();
        all.put("remark", "结合注解 @ResponseBody 返回接送");
        return all;
    }
}
```

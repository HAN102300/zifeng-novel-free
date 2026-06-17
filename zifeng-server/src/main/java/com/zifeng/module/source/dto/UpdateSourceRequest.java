package com.zifeng.module.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateSourceRequest {

    private Long id;

    @NotBlank(message = "bookSourceUrl不能为空")
    @Size(max = 500, message = "bookSourceUrl最大长度500")
    private String bookSourceUrl;

    @Size(max = 100, message = "bookSourceName最大长度100")
    private String bookSourceName;

    private String bookSourceGroup;
    private Integer bookSourceType;
    private Boolean enabled;
    private String header;
    private String searchUrl;
    private String exploreUrl;
    private String loginUrl;
    private String loginUi;
    private String jsLib;
    private Integer customOrder;
    private Integer weight;
    private Boolean enabledCookieJar;
    private String concurrentRate;
    private Integer respondTime;
    private Object ruleSearch;
    private Object ruleBookInfo;
    private Object ruleToc;
    private Object ruleContent;
    private Object ruleExplore;
}

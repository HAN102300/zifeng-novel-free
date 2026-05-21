package com.zifeng.module.parse.dto;

import java.util.Map;

public class UnifiedChapter {
    private String name;
    private String url;
    private Integer index;
    private Boolean isVip;
    private Boolean isPay;
    private Boolean isVolume;
    private String tag;
    private String sourceName;

    public UnifiedChapter() {}

    public static UnifiedChapter fromRaw(Map<String, Object> raw, int idx, String sourceName) {
        UnifiedChapter ch = new UnifiedChapter();
        ch.sourceName = sourceName;
        ch.index = idx;
        ch.name = pickFirst(raw, "name", "chapterName", "title", "name");
        if (ch.name == null || ch.name.isEmpty()) {
            ch.name = "第" + (idx + 1) + "章";
        }
        ch.url = pickFirst(raw, "url", "chapterUrl", "path", "href");
        ch.isVip = pickBool(raw, "isVip");
        ch.isPay = pickBool(raw, "isPay");
        ch.isVolume = pickBool(raw, "isVolume");
        ch.tag = pickFirst(raw, "tag");
        return ch;
    }

    private static String pickFirst(Map<String, Object> raw, String... candidates) {
        for (String key : candidates) {
            Object val = raw.get(key);
            if (val != null && !val.toString().isEmpty()) {
                return val.toString().trim();
            }
        }
        return "";
    }

    private static Boolean pickBool(Map<String, Object> raw, String key) {
        Object val = raw.get(key);
        if (val instanceof Boolean) return (Boolean) val;
        if (val instanceof String) return "true".equalsIgnoreCase((String) val);
        return false;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Integer getIndex() { return index; }
    public void setIndex(Integer index) { this.index = index; }
    public Boolean getIsVip() { return isVip; }
    public void setIsVip(Boolean isVip) { this.isVip = isVip; }
    public Boolean getIsPay() { return isPay; }
    public void setIsPay(Boolean isPay) { this.isPay = isPay; }
    public Boolean getIsVolume() { return isVolume; }
    public void setIsVolume(Boolean isVolume) { this.isVolume = isVolume; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
}

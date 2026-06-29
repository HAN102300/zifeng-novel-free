package com.zifeng.module.admin.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.lionsoul.ip2region.xdb.Searcher;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Slf4j
@Service
public class IpRegionService {

    private Searcher searcher;
    private byte[] buffer;
    private Path tempFile;

    @PostConstruct
    public void init() {
        try {
            // 从 classpath 加载 xdb 文件到内存（全内存缓存，查询最快）
            ClassPathResource resource = new ClassPathResource("ip2region.xdb");
            try (InputStream is = resource.getInputStream()) {
                tempFile = Files.createTempFile("ip2region", ".xdb");
                Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }

            buffer = Searcher.loadContentFromFile(tempFile.toString());
            searcher = Searcher.newWithBuffer(buffer);
            log.info("IpRegionService initialized, xdb loaded into memory");
        } catch (Exception e) {
            log.error("Failed to initialize IpRegionService: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void destroy() {
        if (searcher != null) {
            try {
                searcher.close();
            } catch (IOException e) {
                log.warn("Failed to close searcher: {}", e.getMessage());
            }
        }
        if (tempFile != null) {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException e) {
                log.warn("Failed to delete temp xdb file: {}", e.getMessage());
            }
        }
    }

    /**
     * 根据 IP 地址查询归属地
     * 返回格式：中国|0|江苏省|苏州市|电信 或 国家|区域|省|市|ISP
     * 简化后返回：江苏省苏州市 或 中国 或 本地网络
     */
    public String getRegion(String ip) {
        if (ip == null || ip.isBlank()) return null;

        // 本地/内网 IP
        if (ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1")
                || ip.startsWith("192.168.") || ip.startsWith("10.")
                || ip.startsWith("172.16.") || ip.startsWith("172.17.")
                || ip.startsWith("172.18.") || ip.startsWith("172.19.")
                || ip.startsWith("172.2") || ip.startsWith("172.3")) {
            return "本地网络";
        }

        if (searcher == null) return null;

        try {
            String raw = searcher.search(ip);
            return simplifyRegion(raw);
        } catch (Exception e) {
            log.debug("IP region lookup failed for {}: {}", ip, e.getMessage());
            return null;
        }
    }

    /**
     * 简化 ip2region 的原始输出
     * 中国IP格式：中国|0|江苏省|苏州市|电信 → 江苏省苏州市
     * 海外IP格式：United States|Texas|Spring|0|US → 美国德克萨斯州Spring
     */
    private String simplifyRegion(String raw) {
        if (raw == null || raw.isBlank()) return null;

        String[] parts = raw.split("\\|");
        String country = safeGet(parts, 0);
        String region = safeGet(parts, 1);
        String province = safeGet(parts, 2);
        String city = safeGet(parts, 3);

        // 去掉 0 占位符
        if ("0".equals(region)) region = null;
        if ("0".equals(province)) province = null;
        if ("0".equals(city)) city = null;

        // 判断是否为中国IP（国家字段包含中文或"CN"）
        boolean isChina = country != null && (country.contains("中国") || "CN".equals(country));

        if (isChina) {
            // 中国IP：省份+城市
            StringBuilder sb = new StringBuilder();
            if (province != null && city != null && !province.equals(city)) {
                sb.append(province).append(city);
            } else if (province != null) {
                sb.append(province);
            } else if (region != null) {
                sb.append(region);
            }
            return sb.length() > 0 ? sb.toString() : "中国";
        } else {
            // 海外IP：国家+区域/州+城市
            StringBuilder sb = new StringBuilder();
            String cnName = translateCountry(country);
            if (cnName != null) sb.append(cnName);
            if (region != null) sb.append(region);
            if (province != null && !province.equals(region)) sb.append(province);
            return sb.length() > 0 ? sb.toString() : null;
        }
    }

    private static final java.util.Map<String, String> COUNTRY_MAP = java.util.Map.ofEntries(
            java.util.Map.entry("US", "美国"), java.util.Map.entry("United States", "美国"),
            java.util.Map.entry("JP", "日本"), java.util.Map.entry("Japan", "日本"),
            java.util.Map.entry("KR", "韩国"), java.util.Map.entry("South Korea", "韩国"),
            java.util.Map.entry("GB", "英国"), java.util.Map.entry("United Kingdom", "英国"),
            java.util.Map.entry("DE", "德国"), java.util.Map.entry("Germany", "德国"),
            java.util.Map.entry("FR", "法国"), java.util.Map.entry("France", "法国"),
            java.util.Map.entry("AU", "澳大利亚"), java.util.Map.entry("Australia", "澳大利亚"),
            java.util.Map.entry("CA", "加拿大"), java.util.Map.entry("Canada", "加拿大"),
            java.util.Map.entry("RU", "俄罗斯"), java.util.Map.entry("Russia", "俄罗斯"),
            java.util.Map.entry("IN", "印度"), java.util.Map.entry("India", "印度"),
            java.util.Map.entry("BR", "巴西"), java.util.Map.entry("Brazil", "巴西"),
            java.util.Map.entry("SG", "新加坡"), java.util.Map.entry("Singapore", "新加坡"),
            java.util.Map.entry("HK", "中国香港"), java.util.Map.entry("Hong Kong", "中国香港"),
            java.util.Map.entry("TW", "中国台湾"), java.util.Map.entry("Taiwan", "中国台湾"),
            java.util.Map.entry("MO", "中国澳门"), java.util.Map.entry("Macao", "中国澳门")
    );

    private String translateCountry(String country) {
        if (country == null) return null;
        String translated = COUNTRY_MAP.get(country);
        return translated != null ? translated : country;
    }

    private String safeGet(String[] arr, int index) {
        if (index < 0 || index >= arr.length) return null;
        String val = arr[index].trim();
        return val.isEmpty() ? null : val;
    }
}

package com.zifeng.module.parse.dto;

import java.util.ArrayList;
import java.util.List;

public class AggregatedSearchResult {
    private String keyword;
    private int page;
    private int totalSources;
    private int succeededSources;
    private int failedSources;
    private int totalResults;
    private int deduplicatedResults;
    private List<UnifiedSearchResult> books;
    private List<SourceSearchMeta> sourceDetails;
    private long elapsedMs;

    public AggregatedSearchResult() {
        this.books = new ArrayList<>();
        this.sourceDetails = new ArrayList<>();
    }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    public int getTotalSources() { return totalSources; }
    public void setTotalSources(int totalSources) { this.totalSources = totalSources; }
    public int getSucceededSources() { return succeededSources; }
    public void setSucceededSources(int succeededSources) { this.succeededSources = succeededSources; }
    public int getFailedSources() { return failedSources; }
    public void setFailedSources(int failedSources) { this.failedSources = failedSources; }
    public int getTotalResults() { return totalResults; }
    public void setTotalResults(int totalResults) { this.totalResults = totalResults; }
    public int getDeduplicatedResults() { return deduplicatedResults; }
    public void setDeduplicatedResults(int deduplicatedResults) { this.deduplicatedResults = deduplicatedResults; }
    public List<UnifiedSearchResult> getBooks() { return books; }
    public void setBooks(List<UnifiedSearchResult> books) { this.books = books; }
    public List<SourceSearchMeta> getSourceDetails() { return sourceDetails; }
    public void setSourceDetails(List<SourceSearchMeta> sourceDetails) { this.sourceDetails = sourceDetails; }
    public long getElapsedMs() { return elapsedMs; }
    public void setElapsedMs(long elapsedMs) { this.elapsedMs = elapsedMs; }

    public static class SourceSearchMeta {
        private String sourceUrl;
        private String sourceName;
        private boolean success;
        private int resultCount;
        private long latencyMs;
        private String error;

        public String getSourceUrl() { return sourceUrl; }
        public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
        public String getSourceName() { return sourceName; }
        public void setSourceName(String sourceName) { this.sourceName = sourceName; }
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public int getResultCount() { return resultCount; }
        public void setResultCount(int resultCount) { this.resultCount = resultCount; }
        public long getLatencyMs() { return latencyMs; }
        public void setLatencyMs(long latencyMs) { this.latencyMs = latencyMs; }
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
    }
}

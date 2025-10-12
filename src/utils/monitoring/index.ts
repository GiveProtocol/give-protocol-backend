import { Logger } from "../logger";
import { PerformanceMetrics } from "../performance/metrics";

interface MonitoringConfig {
  apiKey: string;
  appId: string;
  environment: string;
  enabledMonitors: string[];
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: PerformanceMetrics;
  private readonly config: MonitoringConfig;
  private readonly MAX_BATCH_SIZE = 100;
  private metricQueue: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  private constructor(config: MonitoringConfig) {
    this.config = config;
    this.metrics = PerformanceMetrics.getInstance();
    this.initializeMonitoring();
  }

  static getInstance(config?: MonitoringConfig): MonitoringService {
    if (!this.instance && config) {
      this.instance = new MonitoringService(config);
    }
    return this.instance;
  }

  private initializeMonitoring(): void {
    // Performance monitoring
    this.initializePerformanceObserver();

    // Error monitoring
    window.addEventListener("error", this.handleError.bind(this));
    window.addEventListener(
      "unhandledrejection",
      this.handleRejection.bind(this),
    );

    // Network monitoring
    this.initializeNetworkMonitoring();
  }

  private handleError(event: ErrorEvent): void {
    Logger.error("Application error", {
      message: event.message,
      filename: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
      stack: event.error?.stack,
    });

    this.queueMetric("error", {
      type: "error",
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  private handleRejection(event: PromiseRejectionEvent): void {
    Logger.error("Unhandled promise rejection", {
      reason: event.reason,
    });

    this.queueMetric("error", {
      type: "rejection",
      message: event.reason?.message || "Promise rejection",
      stack: event.reason?.stack,
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  private initializePerformanceObserver(): void {
    // Long tasks
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.queueMetric("longtask", {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
          });
        });
      }).observe({ entryTypes: ["longtask"] });
    }

    // Resource timing
    if (PerformanceObserver.supportedEntryTypes.includes("resource")) {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;
          this.queueMetric("resource", {
            name: resource.name,
            duration: resource.duration,
            transferSize: resource.transferSize,
            initiatorType: resource.initiatorType,
            startTime: resource.startTime,
          });
        });
      }).observe({ entryTypes: ["resource"] });
    }
  }

  private initializeNetworkMonitoring(): void {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - startTime;

        this.queueMetric("api", {
          url: typeof input === "string" ? input : input.url,
          method: init?.method || "GET",
          status: response.status,
          duration,
          timestamp: Date.now(),
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.queueMetric("api", {
          url: typeof input === "string" ? input : input.url,
          method: init?.method || "GET",
          status: 0,
          error: error instanceof Error ? error.message : "Network error",
          duration,
          timestamp: Date.now(),
        });
        throw error;
      }
    };
  }

  private queueMetric(type: string, data: any): void {
    if (!this.config.enabledMonitors.includes(type)) {
      return;
    }

    const metricData = {
      ...data,
      type,
      appId: this.config.appId,
      environment: this.config.environment,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.metricQueue.push(metricData);

    // Flush queue if it reaches max size
    if (this.metricQueue.length >= this.MAX_BATCH_SIZE) {
      this.flushMetricQueue();
    } else if (!this.batchTimeout) {
      // Schedule a flush if not already scheduled
      this.batchTimeout = setTimeout(() => this.flushMetricQueue(), 5000);
    }
  }

  private async flushMetricQueue(): Promise<void> {
    if (this.metricQueue.length === 0) return;

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const metrics = [...this.metricQueue];
    this.metricQueue = [];

    // Log metrics in development
    if (import.meta.env.DEV) {
      Logger.info("Metrics batch", { metrics });
      return;
    }

    try {
      const response = await fetch(`${this.config.apiKey}/metrics/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-ID": this.config.appId,
        },
        body: JSON.stringify({ metrics }),
      });

      if (!response.ok) {
        throw new Error("Failed to send metrics: " + response.statusText);
      }
    } catch (error) {
      Logger.error("Failed to send metrics batch", {
        error,
        metricsCount: metrics.length,
      });
      // Re-queue failed metrics
      this.metricQueue.unshift(...metrics);
    }
  }

  public recordCustomMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {},
  ): void {
    this.queueMetric("custom", {
      name,
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  public recordUserAction(
    action: string,
    details: Record<string, any> = {},
  ): void {
    this.queueMetric("userAction", {
      action,
      details,
      timestamp: Date.now(),
    });
  }

  public getMetrics(): Record<string, any> {
    return this.metrics.getMetrics();
  }
}

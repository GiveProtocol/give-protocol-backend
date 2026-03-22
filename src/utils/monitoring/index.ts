import { Logger } from "../logger";
import { PerformanceMetrics } from "../performance/metrics";

interface MetricEntry {
  type: string;
  appId: string;
  environment: string;
  userAgent: string;
  url: string;
  [key: string]: unknown;
}

interface MonitoringConfig {
  apiKey: string;
  appId: string;
  environment: string;
  enabledMonitors: string[];
}

/**
 * MonitoringService handles performance and error monitoring for the application.
 * It follows a singleton pattern to ensure only one instance is created.
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: PerformanceMetrics;
  private readonly config: MonitoringConfig;
  private readonly MAX_BATCH_SIZE = 100;
  private metricQueue: MetricEntry[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Returns the singleton instance of MonitoringService.
   * If it does not exist and a config is provided, a new instance is created.
   * @param config - Configuration object for monitoring service.
   * @returns The singleton instance of MonitoringService.
   */
  static getInstance(config?: MonitoringConfig): MonitoringService {
    if (!this.instance && config) {
      this.instance = new MonitoringService(config);
    }
    return this.instance;
  }

  private constructor(config: MonitoringConfig) {
    this.config = config;
    this.metrics = PerformanceMetrics.getInstance();
    this.initializeMonitoring();
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

  /**
   * Handles an uncaught error event by logging details to the Logger and queuing an error metric.
   * @param event - The ErrorEvent containing details about the error such as message, filename, line and column numbers, and stack trace.
   */
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

  /**
   * Handles unhandled promise rejections by logging the error and queueing an error metric.
   * @param event The PromiseRejectionEvent containing the rejection reason.
   */
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

  /**
   * Initializes network monitoring by wrapping window.fetch to intercept network requests,
   * measure request duration, and queue metrics for each request.
   * @returns void
   */
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

  /**
   * Queues a metric for later transmission. Checks if the metric type is enabled, then appends it to the internal queue.
   * If the queue reaches the maximum batch size, it is flushed immediately; otherwise, a flush is scheduled after a timeout.
   * @param type - The type of metric to queue.
   * @param data - The metric data payload.
   * @returns void
   */
  private queueMetric(type: string, data: Record<string, unknown>): void {
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

  /**
   * Flushes the metric queue by sending batched metrics to the configured API endpoint.
   *
   * If the queue is empty, this method returns immediately.
   * Clears any existing batch timeout and processes the queued metrics.
   * Logs metrics in development mode, or sends them via HTTP POST in production.
   * In case of failure, logs an error and re-queues metrics for retry.
   *
   * @returns {Promise<void>} A promise that resolves when the flush operation is complete.
   */
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
        throw new Error(`Failed to send metrics: ${response.statusText}`);
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

  /**
   * Records a custom metric with the specified name, value, and optional tags.
   * The metric is queued along with the current timestamp for processing.
   *
   * @param name The name of the custom metric.
   * @param value The numeric value of the custom metric.
   * @param tags Optional key-value pairs to associate with the metric.
   */
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

  /**
   * Records a user action metric with specified details and a timestamp.
   *
   * @param action - The name of the user action to record.
   * @param details - Additional information related to the user action.
   * @returns void
   */
  public recordUserAction(
    action: string,
    details: Record<string, unknown> = {},
  ): void {
    this.queueMetric("userAction", {
      action,
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves the current metrics.
   * @returns A record mapping metric names to their values.
   */
  public getMetrics(): Record<string, unknown> {
    return this.metrics.getMetrics();
  }
}

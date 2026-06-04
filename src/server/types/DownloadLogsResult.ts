export type DownloadLogsResult =
  | {
      success: true;
      logText: string;
      filename: string;
    }
  | {
      success: false;
      statusCode: number;
      message: string;
    };

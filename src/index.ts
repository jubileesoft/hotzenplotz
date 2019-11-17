import "whatwg-fetch";
import { Logger } from "./utils/logger";

export interface IHotzenplotzConfig {
  /** You can either provide a full backend URL or leave it empty
   * and window.location.href will be used.
   */
  backendUrl?: string;

  debug?: boolean;
}

enum LoadStrategy {
  cacheFirst,
  serverFirst
}

interface IDatabaseConfig {
  id: string;
  _type: string;
  revision: number;
}

export class Store {
  // #region Statics

  private static hotzenplotzPrefix: string = "hotzenplotz";

  // #endregion Statics

  // #region Properties

  private config: IHotzenplotzConfig;
  private data: any = {};
  private logger: Logger;

  // #endregion

  // #region Constructor

  constructor(config: IHotzenplotzConfig) {
    this.config = config;

    this.logger = this.config.debug
      ? new Logger(this.config.debug)
      : new Logger(false);

    if (!this.config.backendUrl) {
      this.config.backendUrl = "/";
    } else {
      // Make sure that the last char is a "/"
      if (this.config.backendUrl[this.config.backendUrl.length - 1] !== "/") {
        this.config.backendUrl = this.config.backendUrl + "/";
      }
    }

    // Handle persistency. Load "everything" from LocalStorage
    const systemCollectionName = "system";
    let persistedConfig: IDatabaseConfig;
    const value = window.localStorage.getItem(Store.hotzenplotzPrefix);
    if (value) {
      const collectionNames: string[] = JSON.parse(value);
      collectionNames.forEach((collectionName) => {
        const collectionStringRepresentation = window.localStorage.getItem(
          Store.hotzenplotzPrefix + "_" + collectionName
        );

        if (collectionStringRepresentation) {
          this.data[collectionName] = JSON.parse(
            collectionStringRepresentation
          );
        }
      });

      if (
        this.data[systemCollectionName] instanceof Array &&
        this.data[systemCollectionName][0]
      ) {
        persistedConfig = this.data[systemCollectionName][0];
        this.logger.log(
          "Locally cached database has revision " + persistedConfig.revision
        );
      }
    }

    // Load system collection from server to check if the data is up-to-date
    this.collection(systemCollectionName, LoadStrategy.serverFirst).then(() => {
      const currentConfig: IDatabaseConfig = this.data[systemCollectionName][0];

      this.logger.log(
        "Database on server has revision " + currentConfig.revision
      );

      if (
        persistedConfig &&
        persistedConfig.revision &&
        currentConfig.revision > persistedConfig.revision
      ) {
        // Delete all cached collections except the newly loaded system-collection
        const collectionNames = Object.keys(this.data);
        collectionNames.forEach((collectionName) => {
          if (collectionName === systemCollectionName) {
            return;
          }
          window.localStorage.removeItem(collectionName);
          delete this.data[collectionName];
          this.logger.log(
            "Deleting locally cached collection " + collectionName
          );
        });

        window.localStorage.setItem(
          Store.hotzenplotzPrefix,
          JSON.stringify(Object.keys(this.data))
        );
      }
    });
  }

  // #endregion Constructor

  // #region Public Methods

  /** Retrieve a collection that was either previously persisted or
   * will be fetched from the backend.
   */
  public async collection(
    collectionName: string,
    strategy: LoadStrategy = LoadStrategy.cacheFirst
  ): Promise<object[]> {
    if (strategy === LoadStrategy.cacheFirst && this.data[collectionName]) {
      this.logger.log(`Return collection "${collectionName}" from cache`);
      return this.data[collectionName];
    }

    const path = this.config.backendUrl + collectionName + ".json";
    const response = await window.fetch(path);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        "Collection request to " +
          path +
          " lead to response.status = " +
          response.status
      );
    }

    const items: any[] = await response.json();

    // Manipulate elements and set id to _id.$oid
    items.forEach((item) => {
      item.id = item._id.$oid;
      delete item._id;
    });

    // Set the data
    this.data[collectionName] = items;

    // Persist downloaded data
    window.localStorage.setItem(
      Store.hotzenplotzPrefix + "_" + collectionName,
      JSON.stringify(this.data[collectionName])
    );

    window.localStorage.setItem(
      Store.hotzenplotzPrefix,
      JSON.stringify(Object.keys(this.data))
    );

    this.logger.log(`Return collection "${collectionName}" from server`);
    return this.data[collectionName];
  }

  // #endregion Public Methods
}

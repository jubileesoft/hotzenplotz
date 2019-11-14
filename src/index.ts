import "whatwg-fetch";

export interface IHotzenplotzConfig {
  /** You can either provide a full backend URL or leave it empty
   * and window.location.href will be used.
   */
  backendUrl?: string;

  /** If set to true all loaded collections are persisted to the
   * LocalStorage.
   */
  persistLocally?: boolean;
}

export class Store {
  // #region Statics

  private static hotzenplotzPrefix: string = "hotzenplotz";

  // #endregion Statics

  // #region Properties

  private config: IHotzenplotzConfig;
  private data: any = {};

  // #endregion

  // #region Constructor

  constructor(config: IHotzenplotzConfig) {
    this.config = config;

    if (!this.config.backendUrl) {
      this.config.backendUrl = "/";
    } else {
      // Make sure that the last char is a "/"
      if (this.config.backendUrl[this.config.backendUrl.length - 1] !== "/") {
        this.config.backendUrl = this.config.backendUrl + "/";
      }
    }

    // Handle persistency
    if (this.config.persistLocally) {
      // Load "everything" from LocalStorage
      const value = window.localStorage.getItem(Store.hotzenplotzPrefix);
      if (!value) {
        return;
      }

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
    }
  }

  // #endregion Constructor

  // #region Public Methods

  /** Retrieve a collection that was either previously persisted or
   * will be fetched from the backend.
   */
  public async collection(collectionName: string): Promise<object[]> {
    if (this.data[collectionName]) {
      return this.data[collectionName];
    }

    const path = this.config.backendUrl + collectionName + ".json";
    const response = await window.fetch(path);
    const items: any[] = await response.json();

    // Manipulate elements and set id to _id.$oid
    items.forEach((item) => {
      item.id = item._id.$oid;
      delete item._id;
    });

    // Set the data
    this.data[collectionName] = items;

    // Check if the downloaded data should be persisted
    if (this.config.persistLocally) {
      window.localStorage.setItem(
        Store.hotzenplotzPrefix + "_" + collectionName,
        JSON.stringify(this.data[collectionName])
      );

      window.localStorage.setItem(
        Store.hotzenplotzPrefix,
        JSON.stringify(Object.keys(this.data))
      );
    }

    return this.data[collectionName];
  }

  // #endregion Public Methods
}

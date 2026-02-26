import type { AllEntities, Entity, PropertiesOf } from 'n8n-workflow';

type SharetribeMap = {
	user: 'get' | 'updateProfile' | 'updatePermissions' | 'approve' | 'getMany';
	listing: 'get' | 'getMany' | 'create' | 'update' | 'close' | 'open' | 'approve';
	transaction: 'get' | 'getMany' | 'transition' | 'updateMetadata';
	marketplace: 'get';
	image: 'upload';
	availabilityExceptions: 'getMany' | 'create' | 'delete';
	stock: 'getMany' | 'adjust' | 'safelySet' | 'getReservation' | 'forceSet' | 'updateStockQuantity';
	asset: 'get';
	event: 'getMany';
};

export type Sharetribe = AllEntities<SharetribeMap>;

export type SharetribeUser = Entity<SharetribeMap, 'user'>;
export type SharetribeListing = Entity<SharetribeMap, 'listing'>;
export type SharetribeTransaction = Entity<SharetribeMap, 'transaction'>;
export type SharetribeMarketplace = Entity<SharetribeMap, 'marketplace'>;
export type SharetribeImage = Entity<SharetribeMap, 'image'>;
export type SharetribeAvailabilityExceptions = Entity<SharetribeMap, 'availabilityExceptions'>;
export type SharetribeStock = Entity<SharetribeMap, 'stock'>;
export type SharetribeAsset = Entity<SharetribeMap, 'asset'>;
export type SharetribeEvent = Entity<SharetribeMap, 'event'>;

export type UserProperties = PropertiesOf<SharetribeUser>;
export type ListingProperties = PropertiesOf<SharetribeListing>;
export type TransactionProperties = PropertiesOf<SharetribeTransaction>;
export type MarketplaceProperties = PropertiesOf<SharetribeMarketplace>;
export type ImageProperties = PropertiesOf<SharetribeImage>;
export type AvailabilityExceptionProperties = PropertiesOf<SharetribeAvailabilityExceptions>;
export type StockProperties = PropertiesOf<SharetribeStock>;
export type AssetProperties = PropertiesOf<SharetribeAsset>;
export type EventProperties = PropertiesOf<SharetribeEvent>;

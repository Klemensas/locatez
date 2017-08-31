import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { isEnabled, watchLocation, clearWatch, enableLocationRequest, Location } from 'nativescript-geolocation';
import { MapView, Circle, Position } from 'nativescript-google-maps-sdk';
import { Color } from 'tns-core-modules/color';
import { Accuracy } from 'ui/enums';
import * as application from 'application';
declare var com: any;
registerElement('MapView', () => MapView);

@Component({
		selector: 'ns-map',
		moduleId: module.id,
		templateUrl: './map.component.html',
})
export class MapComponent implements OnInit, OnDestroy {
	// Toggle location providers
	GOOGLE_API_ENABLED = true;
	ANDROID_API_ENABLED = true;
	MY_LOCATION = true;
	ANDROID_CIRCLE = false;
	GOOGLE_CIRCLE = false;


	GoogleApiClient = com.google.android.gms.common.api.GoogleApiClient;
	LocationServices = com.google.android.gms.location.LocationServices;
	LocationRequest = com.google.android.gms.location.LocationRequest;
	LocationListener = com.google.android.gms.location.LocationListener;
	LocationSettingsRequest = com.google.android.gms.location.LocationSettingsRequest;
	LocationSettingsResult = com.google.android.gms.location.LocationSettingsResult;
	Maps = com.google.android.gms.maps;
	googleApiClient = null;
	locationRequest;
	locationListener;

	mapView: MapView;
	watchId: number;
	fused = {};
	fusedAcc = [];
	locMan = {};
	locManAcc = [];

	constructor() {
		if (this.GOOGLE_API_ENABLED) {
			this.initGoogleApiClient();
		}
	}

	initGoogleApiClient() {
		return new Promise((resolve, reject) => {
			this.locationRequest = new this.LocationRequest.create();
			this.locationRequest.setInterval(1000);
			this.locationRequest.setFastestInterval(1000);
			this.locationRequest.setPriority(100)

			if (this.googleApiClient == null) {
				this.googleApiClient = new this.GoogleApiClient.Builder(application.android.context)
				.addConnectionCallbacks(new this.GoogleApiClient.ConnectionCallbacks({
					onConnected: () => {
						console.log('GoogleApiClient: CONNECTED');
						let circle;
						this.LocationServices.FusedLocationApi.requestLocationUpdates(this.googleApiClient, this.locationRequest, new this.LocationListener({
							onLocationChanged: (data) => {
								// update blue dot location only if mapReady is done (because you might want to get your location rolling before maps start, for exmaple, connecting to a server closest to you)
								if (this.locationListener ) {
									this.locationListener.onLocationChanged(data);
								}

								var location = this.serialize(data);

								if (!location) {
									return;
								}
								this.fusedAcc.push(location.accuracy);
								this.fusedAcc.sort((a, b) => a - b);
								const avgAcc = (this.fusedAcc.reduce((a, b) => a + b ) / this.fusedAcc.length);
								this.fused = {
									acc: location.accuracy.toPrecision(2),
									bestAcc: this.fusedAcc[0].toPrecision(2),
									avgAcc: avgAcc.toPrecision(2),
									bearing: location.bearing,
									speed: location.speed,
									lat: location.latitude,
									lng: location.longitude,
									alt: location.altitude,
								};
								console.log('Google API', JSON.stringify(this.fused));
								if (!this.GOOGLE_CIRCLE) { return; }
								if (circle) {
									this.mapView.removeShape(circle);
								}
								circle = new Circle();
								circle.center = Position.positionFromLatLng(location.latitude, location.longitude);
								circle.radius = location.accuracy;
								circle.strokeColor = new Color(75, 244, 67, 54);
								this.mapView.addCircle(circle);
								resolve(true);
							}
						}));
					},
					onConnectionSuspended: () => {
						console.log('GoogleApiClient: SUSPENDED');
					}
				}))
				.addOnConnectionFailedListener(new this.GoogleApiClient.OnConnectionFailedListener({
					onConnectionFailed: () => {
						console.log('GoogleApiClient: CONNECTION ERROR');
					}
				}))
				.addApi(this.LocationServices.API)
				.build();
			}

			this.googleApiClient.connect();
		});
	}

	getLastKnownLocation() {
		return new Promise((resolve, reject) => {
			var location = this.LocationServices.FusedLocationApi.getLastLocation(this.googleApiClient);
			resolve(this.serialize(location));
		});
	}

	serialize(location) {
		return location ? {
			provider: location.getProvider(),
			timestamp: new Date(location.getTime()),
			accuracy: location.hasAccuracy() ? location.getAccuracy() : null,
			latitude: location.getLatitude(),
			longitude: location.getLongitude(),
			altitude: location.hasAltitude() ? location.getAltitude() : null,
			speed: location.hasSpeed() ? location.getSpeed() : null,
			bearing: location.hasBearing() ? location.getBearing() : null,
			extras: location.getExtras(),
		} : null;
	}

	//Map events
	onMapReady(event) {
		this.mapView = event.object;
		if (this.GOOGLE_API_ENABLED) {
			event.gMap.setLocationSource(new com.google.android.gms.maps.LocationSource({
				activate: (onLocationChangedListener) => {
					this.locationListener = onLocationChangedListener;
				}
			}));
		}
		if (this.ANDROID_API_ENABLED) {
			this.monitorLocation();
		}
		event.gMap.setMyLocationEnabled(this.MY_LOCATION);
	};

	monitorLocation() {
		console.log('Start Locationmanager watch');
		let circle;
		this.watchId = watchLocation(
			(location: Location) => {
				const acc = Math.min(location.verticalAccuracy, location.horizontalAccuracy);
				this.locManAcc.push(acc);
				this.locManAcc.sort((a, b) => a - b);
				const avgAcc = (this.locManAcc.reduce((a, b) => a + b ) / this.locManAcc.length);
				this.locMan = {
					acc: acc.toPrecision(2),
					bestAcc: this.locManAcc[0].toPrecision(2),
					avgAcc: avgAcc.toPrecision(2),
					bearing: location.direction,
					speed: location.speed,
					lat: location.latitude,
					lng: location.longitude,
					alt: location.altitude,
				};
				console.log('Android API', JSON.stringify(this.locMan));
				if (!this.ANDROID_CIRCLE) { return; }
				if (circle) {
					this.mapView.removeShape(circle);
				}
				circle = new Circle();
				circle.center = Position.positionFromLatLng(location.latitude, location.longitude);
				circle.radius = acc;
				circle.strokeColor = new Color(75, 76, 175, 80);
				this.mapView.addCircle(circle);
			},
			(error) => console.error('location error', error),
			{
				desiredAccuracy: Accuracy.high,
				updateDistance: 0.1,
				minimumUpdateTime: 1000,
				maximumAge: 1000,
			}
		);
	}

	ngOnInit(): void {}

	ngOnDestroy(): void {
		clearWatch(this.watchId);
	}
}
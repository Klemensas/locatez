"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var element_registry_1 = require("nativescript-angular/element-registry");
var nativescript_geolocation_1 = require("nativescript-geolocation");
var nativescript_google_maps_sdk_1 = require("nativescript-google-maps-sdk");
var color_1 = require("tns-core-modules/color");
var enums_1 = require("ui/enums");
var application = require("application");
element_registry_1.registerElement('MapView', function () { return nativescript_google_maps_sdk_1.MapView; });
var MapComponent = (function () {
    function MapComponent() {
        // Toggle location providers
        this.GOOGLE_API_ENABLED = true;
        this.ANDROID_API_ENABLED = true;
        this.MY_LOCATION = true;
        this.ANDROID_CIRCLE = false;
        this.GOOGLE_CIRCLE = false;
        this.GoogleApiClient = com.google.android.gms.common.api.GoogleApiClient;
        this.LocationServices = com.google.android.gms.location.LocationServices;
        this.LocationRequest = com.google.android.gms.location.LocationRequest;
        this.LocationListener = com.google.android.gms.location.LocationListener;
        this.LocationSettingsRequest = com.google.android.gms.location.LocationSettingsRequest;
        this.LocationSettingsResult = com.google.android.gms.location.LocationSettingsResult;
        this.Maps = com.google.android.gms.maps;
        this.googleApiClient = null;
        this.fused = {};
        this.fusedAcc = [];
        this.locMan = {};
        this.locManAcc = [];
        if (this.GOOGLE_API_ENABLED) {
            this.initGoogleApiClient();
        }
    }
    MapComponent.prototype.initGoogleApiClient = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.locationRequest = new _this.LocationRequest.create();
            _this.locationRequest.setInterval(1000);
            _this.locationRequest.setFastestInterval(1000);
            _this.locationRequest.setPriority(100);
            if (_this.googleApiClient == null) {
                _this.googleApiClient = new _this.GoogleApiClient.Builder(application.android.context)
                    .addConnectionCallbacks(new _this.GoogleApiClient.ConnectionCallbacks({
                    onConnected: function () {
                        console.log('GoogleApiClient: CONNECTED');
                        var circle;
                        _this.LocationServices.FusedLocationApi.requestLocationUpdates(_this.googleApiClient, _this.locationRequest, new _this.LocationListener({
                            onLocationChanged: function (data) {
                                // update blue dot location only if mapReady is done (because you might want to get your location rolling before maps start, for exmaple, connecting to a server closest to you)
                                if (_this.locationListener) {
                                    _this.locationListener.onLocationChanged(data);
                                }
                                var location = _this.serialize(data);
                                if (!location) {
                                    return;
                                }
                                _this.fusedAcc.push(location.accuracy);
                                _this.fusedAcc.sort(function (a, b) { return a - b; });
                                var avgAcc = (_this.fusedAcc.reduce(function (a, b) { return a + b; }) / _this.fusedAcc.length);
                                _this.fused = {
                                    acc: location.accuracy.toPrecision(2),
                                    bestAcc: _this.fusedAcc[0].toPrecision(2),
                                    avgAcc: avgAcc.toPrecision(2),
                                    bearing: location.bearing,
                                    speed: location.speed,
                                    lat: location.latitude,
                                    lng: location.longitude,
                                    alt: location.altitude,
                                };
                                console.log('Google API', JSON.stringify(_this.fused));
                                if (!_this.GOOGLE_CIRCLE) {
                                    return;
                                }
                                if (circle) {
                                    _this.mapView.removeShape(circle);
                                }
                                circle = new nativescript_google_maps_sdk_1.Circle();
                                circle.center = nativescript_google_maps_sdk_1.Position.positionFromLatLng(location.latitude, location.longitude);
                                circle.radius = location.accuracy;
                                circle.strokeColor = new color_1.Color(75, 244, 67, 54);
                                _this.mapView.addCircle(circle);
                                resolve(true);
                            }
                        }));
                    },
                    onConnectionSuspended: function () {
                        console.log('GoogleApiClient: SUSPENDED');
                    }
                }))
                    .addOnConnectionFailedListener(new _this.GoogleApiClient.OnConnectionFailedListener({
                    onConnectionFailed: function () {
                        console.log('GoogleApiClient: CONNECTION ERROR');
                    }
                }))
                    .addApi(_this.LocationServices.API)
                    .build();
            }
            _this.googleApiClient.connect();
        });
    };
    MapComponent.prototype.getLastKnownLocation = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var location = _this.LocationServices.FusedLocationApi.getLastLocation(_this.googleApiClient);
            resolve(_this.serialize(location));
        });
    };
    MapComponent.prototype.serialize = function (location) {
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
    };
    //Map events
    MapComponent.prototype.onMapReady = function (event) {
        var _this = this;
        this.mapView = event.object;
        if (this.GOOGLE_API_ENABLED) {
            event.gMap.setLocationSource(new com.google.android.gms.maps.LocationSource({
                activate: function (onLocationChangedListener) {
                    _this.locationListener = onLocationChangedListener;
                }
            }));
        }
        if (this.ANDROID_API_ENABLED) {
            this.monitorLocation();
        }
        event.gMap.setMyLocationEnabled(this.MY_LOCATION);
    };
    ;
    MapComponent.prototype.monitorLocation = function () {
        var _this = this;
        console.log('Start Locationmanager watch');
        var circle;
        this.watchId = nativescript_geolocation_1.watchLocation(function (location) {
            var acc = Math.min(location.verticalAccuracy, location.horizontalAccuracy);
            _this.locManAcc.push(acc);
            _this.locManAcc.sort(function (a, b) { return a - b; });
            var avgAcc = (_this.locManAcc.reduce(function (a, b) { return a + b; }) / _this.locManAcc.length);
            _this.locMan = {
                acc: acc.toPrecision(2),
                bestAcc: _this.locManAcc[0].toPrecision(2),
                avgAcc: avgAcc.toPrecision(2),
                bearing: location.direction,
                speed: location.speed,
                lat: location.latitude,
                lng: location.longitude,
                alt: location.altitude,
            };
            console.log('Android API', JSON.stringify(_this.locMan));
            if (!_this.ANDROID_CIRCLE) {
                return;
            }
            if (circle) {
                _this.mapView.removeShape(circle);
            }
            circle = new nativescript_google_maps_sdk_1.Circle();
            circle.center = nativescript_google_maps_sdk_1.Position.positionFromLatLng(location.latitude, location.longitude);
            circle.radius = acc;
            circle.strokeColor = new color_1.Color(75, 76, 175, 80);
            _this.mapView.addCircle(circle);
        }, function (error) { return console.error('location error', error); }, {
            desiredAccuracy: enums_1.Accuracy.high,
            updateDistance: 0.1,
            minimumUpdateTime: 1000,
            maximumAge: 1000,
        });
    };
    MapComponent.prototype.ngOnInit = function () { };
    MapComponent.prototype.ngOnDestroy = function () {
        nativescript_geolocation_1.clearWatch(this.watchId);
    };
    MapComponent = __decorate([
        core_1.Component({
            selector: 'ns-map',
            moduleId: module.id,
            templateUrl: './map.component.html',
        }),
        __metadata("design:paramtypes", [])
    ], MapComponent);
    return MapComponent;
}());
exports.MapComponent = MapComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBd0U7QUFDeEUsMEVBQXdFO0FBQ3hFLHFFQUFpSDtBQUNqSCw2RUFBeUU7QUFDekUsZ0RBQStDO0FBQy9DLGtDQUFvQztBQUNwQyx5Q0FBMkM7QUFFM0Msa0NBQWUsQ0FBQyxTQUFTLEVBQUUsY0FBTSxPQUFBLHNDQUFPLEVBQVAsQ0FBTyxDQUFDLENBQUM7QUFPMUM7SUEyQkM7UUExQkEsNEJBQTRCO1FBQzVCLHVCQUFrQixHQUFHLElBQUksQ0FBQztRQUMxQix3QkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDM0IsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFDbkIsbUJBQWMsR0FBRyxLQUFLLENBQUM7UUFDdkIsa0JBQWEsR0FBRyxLQUFLLENBQUM7UUFHdEIsb0JBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUM7UUFDcEUscUJBQWdCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNwRSxvQkFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO1FBQ2xFLHFCQUFnQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7UUFDcEUsNEJBQXVCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQztRQUNsRiwyQkFBc0IsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNC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QUFXLEVBQUUsc0JBQXNCO1NBQ3BDLENBQUM7O09BQ1csWUFBWSxDQXdMeEI7SUFBRCxtQkFBQztDQUFBLEFBeExELElBd0xDO0FBeExZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBWaWV3Q2hpbGQsIE9uSW5pdCwgT25EZXN0cm95IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyByZWdpc3RlckVsZW1lbnQgfSBmcm9tICduYXRpdmVzY3JpcHQtYW5ndWxhci9lbGVtZW50LXJlZ2lzdHJ5JztcbmltcG9ydCB7IGlzRW5hYmxlZCwgd2F0Y2hMb2NhdGlvbiwgY2xlYXJXYXRjaCwgZW5hYmxlTG9jYXRpb25SZXF1ZXN0LCBMb2NhdGlvbiB9IGZyb20gJ25hdGl2ZXNjcmlwdC1nZW9sb2NhdGlvbic7XG5pbXBvcnQgeyBNYXBWaWV3LCBDaXJjbGUsIFBvc2l0aW9uIH0gZnJvbSAnbmF0aXZlc2NyaXB0LWdvb2dsZS1tYXBzLXNkayc7XG5pbXBvcnQgeyBDb2xvciB9IGZyb20gJ3Rucy1jb3JlLW1vZHVsZXMvY29sb3InO1xuaW1wb3J0IHsgQWNjdXJhY3kgfSBmcm9tICd1aS9lbnVtcyc7XG5pbXBvcnQgKiBhcyBhcHBsaWNhdGlvbiBmcm9tICdhcHBsaWNhdGlvbic7XG5kZWNsYXJlIHZhciBjb206IGFueTtcbnJlZ2lzdGVyRWxlbWVudCgnTWFwVmlldycsICgpID0+IE1hcFZpZXcpO1xuXG5AQ29tcG9uZW50KHtcblx0XHRzZWxlY3RvcjogJ25zLW1hcCcsXG5cdFx0bW9kdWxlSWQ6IG1vZHVsZS5pZCxcblx0XHR0ZW1wbGF0ZVVybDogJy4vbWFwLmNvbXBvbmVudC5odG1sJyxcbn0pXG5leHBvcnQgY2xhc3MgTWFwQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkRlc3Ryb3kge1xuXHQvLyBUb2dnbGUgbG9jYXRpb24gcHJvdmlkZXJzXG5cdEdPT0dMRV9BUElfRU5BQkxFRCA9IHRydWU7XG5cdEFORFJPSURfQVBJX0VOQUJMRUQgPSB0cnVlO1xuXHRNWV9MT0NBVElPTiA9IHRydWU7XG5cdEFORFJPSURfQ0lSQ0xFID0gZmFsc2U7XG5cdEdPT0dMRV9DSVJDTEUgPSBmYWxzZTtcblxuXG5cdEdvb2dsZUFwaUNsaWVudCA9IGNvbS5nb29nbGUuYW5kcm9pZC5nbXMuY29tbW9uLmFwaS5Hb29nbGVBcGlDbGllbnQ7XG5cdExvY2F0aW9uU2VydmljZXMgPSBjb20uZ29vZ2xlLmFuZHJvaWQuZ21zLmxvY2F0aW9uLkxvY2F0aW9uU2VydmljZXM7XG5cdExvY2F0aW9uUmVxdWVzdCA9IGNvbS5nb29nbGUuYW5kcm9pZC5nbXMubG9jYXRpb24uTG9jYXRpb25SZXF1ZXN0O1xuXHRMb2NhdGlvbkxpc3RlbmVyID0gY29tLmdvb2dsZS5hbmRyb2lkLmdtcy5sb2NhdGlvbi5Mb2NhdGlvbkxpc3RlbmVyO1xuXHRMb2NhdGlvblNldHRpbmdzUmVxdWVzdCA9IGNvbS5nb29nbGUuYW5kcm9pZC5nbXMubG9jYXRpb24uTG9jYXRpb25TZXR0aW5nc1JlcXVlc3Q7XG5cdExvY2F0aW9uU2V0dGluZ3NSZXN1bHQgPSBjb20uZ29vZ2xlLmFuZHJvaWQuZ21zLmxvY2F0aW9uLkxvY2F0aW9uU2V0dGluZ3NSZXN1bHQ7XG5cdE1hcHMgPSBjb20uZ29vZ2xlLmFuZHJvaWQuZ21zLm1hcHM7XG5cdGdvb2dsZUFwaUNsaWVudCA9IG51bGw7XG5cdGxvY2F0aW9uUmVxdWVzdDtcblx0bG9jYXRpb25MaXN0ZW5lcjtcblxuXHRtYXBWaWV3OiBNYXBWaWV3O1xuXHR3YXRjaElkOiBudW1iZXI7XG5cdGZ1c2VkID0ge307XG5cdGZ1c2VkQWNjID0gW107XG5cdGxvY01hbiA9IHt9O1xuXHRsb2NNYW5BY2MgPSBbXTtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRpZiAodGhpcy5HT09HTEVfQVBJX0VOQUJMRUQpIHtcblx0XHRcdHRoaXMuaW5pdEdvb2dsZUFwaUNsaWVudCgpO1xuXHRcdH1cblx0fVxuXG5cdGluaXRHb29nbGVBcGlDbGllbnQoKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHRoaXMubG9jYXRpb25SZXF1ZXN0ID0gbmV3IHRoaXMuTG9jYXRpb25SZXF1ZXN0LmNyZWF0ZSgpO1xuXHRcdFx0dGhpcy5sb2NhdGlvblJlcXVlc3Quc2V0SW50ZXJ2YWwoMTAwMCk7XG5cdFx0XHR0aGlzLmxvY2F0aW9uUmVxdWVzdC5zZXRGYXN0ZXN0SW50ZXJ2YWwoMTAwMCk7XG5cdFx0XHR0aGlzLmxvY2F0aW9uUmVxdWVzdC5zZXRQcmlvcml0eSgxMDApXG5cblx0XHRcdGlmICh0aGlzLmdvb2dsZUFwaUNsaWVudCA9PSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuZ29vZ2xlQXBpQ2xpZW50ID0gbmV3IHRoaXMuR29vZ2xlQXBpQ2xpZW50LkJ1aWxkZXIoYXBwbGljYXRpb24uYW5kcm9pZC5jb250ZXh0KVxuXHRcdFx0XHQuYWRkQ29ubmVjdGlvbkNhbGxiYWNrcyhuZXcgdGhpcy5Hb29nbGVBcGlDbGllbnQuQ29ubmVjdGlvbkNhbGxiYWNrcyh7XG5cdFx0XHRcdFx0b25Db25uZWN0ZWQ6ICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdHb29nbGVBcGlDbGllbnQ6IENPTk5FQ1RFRCcpO1xuXHRcdFx0XHRcdFx0bGV0IGNpcmNsZTtcblx0XHRcdFx0XHRcdHRoaXMuTG9jYXRpb25TZXJ2aWNlcy5GdXNlZExvY2F0aW9uQXBpLnJlcXVlc3RMb2NhdGlvblVwZGF0ZXModGhpcy5nb29nbGVBcGlDbGllbnQsIHRoaXMubG9jYXRpb25SZXF1ZXN0LCBuZXcgdGhpcy5Mb2NhdGlvbkxpc3RlbmVyKHtcblx0XHRcdFx0XHRcdFx0b25Mb2NhdGlvbkNoYW5nZWQ6IChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIGJsdWUgZG90IGxvY2F0aW9uIG9ubHkgaWYgbWFwUmVhZHkgaXMgZG9uZSAoYmVjYXVzZSB5b3UgbWlnaHQgd2FudCB0byBnZXQgeW91ciBsb2NhdGlvbiByb2xsaW5nIGJlZm9yZSBtYXBzIHN0YXJ0LCBmb3IgZXhtYXBsZSwgY29ubmVjdGluZyB0byBhIHNlcnZlciBjbG9zZXN0IHRvIHlvdSlcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5sb2NhdGlvbkxpc3RlbmVyICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5sb2NhdGlvbkxpc3RlbmVyLm9uTG9jYXRpb25DaGFuZ2VkKGRhdGEpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdHZhciBsb2NhdGlvbiA9IHRoaXMuc2VyaWFsaXplKGRhdGEpO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFsb2NhdGlvbikge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZ1c2VkQWNjLnB1c2gobG9jYXRpb24uYWNjdXJhY3kpO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuZnVzZWRBY2Muc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGF2Z0FjYyA9ICh0aGlzLmZ1c2VkQWNjLnJlZHVjZSgoYSwgYikgPT4gYSArIGIgKSAvIHRoaXMuZnVzZWRBY2MubGVuZ3RoKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZ1c2VkID0ge1xuXHRcdFx0XHRcdFx0XHRcdFx0YWNjOiBsb2NhdGlvbi5hY2N1cmFjeS50b1ByZWNpc2lvbigyKSxcblx0XHRcdFx0XHRcdFx0XHRcdGJlc3RBY2M6IHRoaXMuZnVzZWRBY2NbMF0udG9QcmVjaXNpb24oMiksXG5cdFx0XHRcdFx0XHRcdFx0XHRhdmdBY2M6IGF2Z0FjYy50b1ByZWNpc2lvbigyKSxcblx0XHRcdFx0XHRcdFx0XHRcdGJlYXJpbmc6IGxvY2F0aW9uLmJlYXJpbmcsXG5cdFx0XHRcdFx0XHRcdFx0XHRzcGVlZDogbG9jYXRpb24uc3BlZWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRsYXQ6IGxvY2F0aW9uLmxhdGl0dWRlLFxuXHRcdFx0XHRcdFx0XHRcdFx0bG5nOiBsb2NhdGlvbi5sb25naXR1ZGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRhbHQ6IGxvY2F0aW9uLmFsdGl0dWRlLFxuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0dvb2dsZSBBUEknLCBKU09OLnN0cmluZ2lmeSh0aGlzLmZ1c2VkKSk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF0aGlzLkdPT0dMRV9DSVJDTEUpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNpcmNsZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5tYXBWaWV3LnJlbW92ZVNoYXBlKGNpcmNsZSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGNpcmNsZSA9IG5ldyBDaXJjbGUoKTtcblx0XHRcdFx0XHRcdFx0XHRjaXJjbGUuY2VudGVyID0gUG9zaXRpb24ucG9zaXRpb25Gcm9tTGF0TG5nKGxvY2F0aW9uLmxhdGl0dWRlLCBsb2NhdGlvbi5sb25naXR1ZGUpO1xuXHRcdFx0XHRcdFx0XHRcdGNpcmNsZS5yYWRpdXMgPSBsb2NhdGlvbi5hY2N1cmFjeTtcblx0XHRcdFx0XHRcdFx0XHRjaXJjbGUuc3Ryb2tlQ29sb3IgPSBuZXcgQ29sb3IoNzUsIDI0NCwgNjcsIDU0KTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLm1hcFZpZXcuYWRkQ2lyY2xlKGNpcmNsZSk7XG5cdFx0XHRcdFx0XHRcdFx0cmVzb2x2ZSh0cnVlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25Db25uZWN0aW9uU3VzcGVuZGVkOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnR29vZ2xlQXBpQ2xpZW50OiBTVVNQRU5ERUQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pKVxuXHRcdFx0XHQuYWRkT25Db25uZWN0aW9uRmFpbGVkTGlzdGVuZXIobmV3IHRoaXMuR29vZ2xlQXBpQ2xpZW50Lk9uQ29ubmVjdGlvbkZhaWxlZExpc3RlbmVyKHtcblx0XHRcdFx0XHRvbkNvbm5lY3Rpb25GYWlsZWQ6ICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdHb29nbGVBcGlDbGllbnQ6IENPTk5FQ1RJT04gRVJST1InKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pKVxuXHRcdFx0XHQuYWRkQXBpKHRoaXMuTG9jYXRpb25TZXJ2aWNlcy5BUEkpXG5cdFx0XHRcdC5idWlsZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdvb2dsZUFwaUNsaWVudC5jb25uZWN0KCk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXRMYXN0S25vd25Mb2NhdGlvbigpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0dmFyIGxvY2F0aW9uID0gdGhpcy5Mb2NhdGlvblNlcnZpY2VzLkZ1c2VkTG9jYXRpb25BcGkuZ2V0TGFzdExvY2F0aW9uKHRoaXMuZ29vZ2xlQXBpQ2xpZW50KTtcblx0XHRcdHJlc29sdmUodGhpcy5zZXJpYWxpemUobG9jYXRpb24pKTtcblx0XHR9KTtcblx0fVxuXG5cdHNlcmlhbGl6ZShsb2NhdGlvbikge1xuXHRcdHJldHVybiBsb2NhdGlvbiA/IHtcblx0XHRcdHByb3ZpZGVyOiBsb2NhdGlvbi5nZXRQcm92aWRlcigpLFxuXHRcdFx0dGltZXN0YW1wOiBuZXcgRGF0ZShsb2NhdGlvbi5nZXRUaW1lKCkpLFxuXHRcdFx0YWNjdXJhY3k6IGxvY2F0aW9uLmhhc0FjY3VyYWN5KCkgPyBsb2NhdGlvbi5nZXRBY2N1cmFjeSgpIDogbnVsbCxcblx0XHRcdGxhdGl0dWRlOiBsb2NhdGlvbi5nZXRMYXRpdHVkZSgpLFxuXHRcdFx0bG9uZ2l0dWRlOiBsb2NhdGlvbi5nZXRMb25naXR1ZGUoKSxcblx0XHRcdGFsdGl0dWRlOiBsb2NhdGlvbi5oYXNBbHRpdHVkZSgpID8gbG9jYXRpb24uZ2V0QWx0aXR1ZGUoKSA6IG51bGwsXG5cdFx0XHRzcGVlZDogbG9jYXRpb24uaGFzU3BlZWQoKSA/IGxvY2F0aW9uLmdldFNwZWVkKCkgOiBudWxsLFxuXHRcdFx0YmVhcmluZzogbG9jYXRpb24uaGFzQmVhcmluZygpID8gbG9jYXRpb24uZ2V0QmVhcmluZygpIDogbnVsbCxcblx0XHRcdGV4dHJhczogbG9jYXRpb24uZ2V0RXh0cmFzKCksXG5cdFx0fSA6IG51bGw7XG5cdH1cblxuXHQvL01hcCBldmVudHNcblx0b25NYXBSZWFkeShldmVudCkge1xuXHRcdHRoaXMubWFwVmlldyA9IGV2ZW50Lm9iamVjdDtcblx0XHRpZiAodGhpcy5HT09HTEVfQVBJX0VOQUJMRUQpIHtcblx0XHRcdGV2ZW50LmdNYXAuc2V0TG9jYXRpb25Tb3VyY2UobmV3IGNvbS5nb29nbGUuYW5kcm9pZC5nbXMubWFwcy5Mb2NhdGlvblNvdXJjZSh7XG5cdFx0XHRcdGFjdGl2YXRlOiAob25Mb2NhdGlvbkNoYW5nZWRMaXN0ZW5lcikgPT4ge1xuXHRcdFx0XHRcdHRoaXMubG9jYXRpb25MaXN0ZW5lciA9IG9uTG9jYXRpb25DaGFuZ2VkTGlzdGVuZXI7XG5cdFx0XHRcdH1cblx0XHRcdH0pKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuQU5EUk9JRF9BUElfRU5BQkxFRCkge1xuXHRcdFx0dGhpcy5tb25pdG9yTG9jYXRpb24oKTtcblx0XHR9XG5cdFx0ZXZlbnQuZ01hcC5zZXRNeUxvY2F0aW9uRW5hYmxlZCh0aGlzLk1ZX0xPQ0FUSU9OKTtcblx0fTtcblxuXHRtb25pdG9yTG9jYXRpb24oKSB7XG5cdFx0Y29uc29sZS5sb2coJ1N0YXJ0IExvY2F0aW9ubWFuYWdlciB3YXRjaCcpO1xuXHRcdGxldCBjaXJjbGU7XG5cdFx0dGhpcy53YXRjaElkID0gd2F0Y2hMb2NhdGlvbihcblx0XHRcdChsb2NhdGlvbjogTG9jYXRpb24pID0+IHtcblx0XHRcdFx0Y29uc3QgYWNjID0gTWF0aC5taW4obG9jYXRpb24udmVydGljYWxBY2N1cmFjeSwgbG9jYXRpb24uaG9yaXpvbnRhbEFjY3VyYWN5KTtcblx0XHRcdFx0dGhpcy5sb2NNYW5BY2MucHVzaChhY2MpO1xuXHRcdFx0XHR0aGlzLmxvY01hbkFjYy5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG5cdFx0XHRcdGNvbnN0IGF2Z0FjYyA9ICh0aGlzLmxvY01hbkFjYy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiICkgLyB0aGlzLmxvY01hbkFjYy5sZW5ndGgpO1xuXHRcdFx0XHR0aGlzLmxvY01hbiA9IHtcblx0XHRcdFx0XHRhY2M6IGFjYy50b1ByZWNpc2lvbigyKSxcblx0XHRcdFx0XHRiZXN0QWNjOiB0aGlzLmxvY01hbkFjY1swXS50b1ByZWNpc2lvbigyKSxcblx0XHRcdFx0XHRhdmdBY2M6IGF2Z0FjYy50b1ByZWNpc2lvbigyKSxcblx0XHRcdFx0XHRiZWFyaW5nOiBsb2NhdGlvbi5kaXJlY3Rpb24sXG5cdFx0XHRcdFx0c3BlZWQ6IGxvY2F0aW9uLnNwZWVkLFxuXHRcdFx0XHRcdGxhdDogbG9jYXRpb24ubGF0aXR1ZGUsXG5cdFx0XHRcdFx0bG5nOiBsb2NhdGlvbi5sb25naXR1ZGUsXG5cdFx0XHRcdFx0YWx0OiBsb2NhdGlvbi5hbHRpdHVkZSxcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0FuZHJvaWQgQVBJJywgSlNPTi5zdHJpbmdpZnkodGhpcy5sb2NNYW4pKTtcblx0XHRcdFx0aWYgKCF0aGlzLkFORFJPSURfQ0lSQ0xFKSB7IHJldHVybjsgfVxuXHRcdFx0XHRpZiAoY2lyY2xlKSB7XG5cdFx0XHRcdFx0dGhpcy5tYXBWaWV3LnJlbW92ZVNoYXBlKGNpcmNsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2lyY2xlID0gbmV3IENpcmNsZSgpO1xuXHRcdFx0XHRjaXJjbGUuY2VudGVyID0gUG9zaXRpb24ucG9zaXRpb25Gcm9tTGF0TG5nKGxvY2F0aW9uLmxhdGl0dWRlLCBsb2NhdGlvbi5sb25naXR1ZGUpO1xuXHRcdFx0XHRjaXJjbGUucmFkaXVzID0gYWNjO1xuXHRcdFx0XHRjaXJjbGUuc3Ryb2tlQ29sb3IgPSBuZXcgQ29sb3IoNzUsIDc2LCAxNzUsIDgwKTtcblx0XHRcdFx0dGhpcy5tYXBWaWV3LmFkZENpcmNsZShjaXJjbGUpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4gY29uc29sZS5lcnJvcignbG9jYXRpb24gZXJyb3InLCBlcnJvciksXG5cdFx0XHR7XG5cdFx0XHRcdGRlc2lyZWRBY2N1cmFjeTogQWNjdXJhY3kuaGlnaCxcblx0XHRcdFx0dXBkYXRlRGlzdGFuY2U6IDAuMSxcblx0XHRcdFx0bWluaW11bVVwZGF0ZVRpbWU6IDEwMDAsXG5cdFx0XHRcdG1heGltdW1BZ2U6IDEwMDAsXG5cdFx0XHR9XG5cdFx0KTtcblx0fVxuXG5cdG5nT25Jbml0KCk6IHZvaWQge31cblxuXHRuZ09uRGVzdHJveSgpOiB2b2lkIHtcblx0XHRjbGVhcldhdGNoKHRoaXMud2F0Y2hJZCk7XG5cdH1cbn0iXX0=
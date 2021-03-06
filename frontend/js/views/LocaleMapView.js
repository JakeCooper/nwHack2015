define([
	'jquery',
	'thorax',
	'bootstrapjs',
	'LocaleUtilities',
	'LocaleProfileView',
	'LocaleChatroomListView',
	'LocaleSearchView',
	'LocaleChatModel',
	'LocaleSearchModel',
	'LocaleSocket',
	'LocaleAuth',
	'async!http://maps.google.com/maps/api/js?sensor=false!callback',
	'MarkerClusterer',
	'hbs!templates/LocaleMapView'
], function($, Thorax, Bootstrap, LocaleUtilities, LocaleProfileView, LocaleChatroomListView, LocaleSearchView, LocaleChatModel, 
	LocaleSearchModel, LocaleSocket, LocaleAuth, GMaps, MarkerClusterer, MapTemplate) {

	var ProfileView,
		ChatroomListView;

	var Map,
		GeoDecoder,
		Clusterer,
		CurrentPosition = undefined;

	var mapOptions = {
		  zoom: 13,
		  mapTypeId: google.maps.MapTypeId.ROADMAP,
		  disableDefaultUI: true
	};

	var mapMarkers = [];

	var LocaleMapView = Thorax.View.extend({
		el: '#mappage',

		name: "MapView",

		events: {
			'rendered' : 'rendered'
		},

		template: MapTemplate,

		searchView: new LocaleSearchView({model: new LocaleSearchModel()}),

		initialize: function() {

			this._addChild(this.searchView);

			GeoDecoder = new google.maps.Geocoder();

			LocaleSocket.Handle('deletelocale', function(roomName) {
				_.each(ChatroomListView.getRooms(), function(chat) {

					if(chat.model.get("name") === roomName)
					{
						ChatroomListView.deleteRoom(chat);
					}
				});

				// Remove room marker
				var mapIndex = -1;

				// Find the marker
				for(var i = 0; i < mapMarkers.length; i++) {
					if(mapMarkers[i].name === roomName) {
						mapIndex = i;
						break;
					}
				}

				// Reset the markers by deleting their reference
				if( mapIndex !== -1)
				{
					var localeMarker = mapMarkers[mapIndex];
					mapMarkers.splice(mapIndex, 1);

					localeMarker.map.circle.setMap(null);
					localeMarker.map.marker.setMap(null);

					delete localeMarker.map.circle;
					delete localeMarker.map.marker;
				}
			});

			LocaleSocket.Handle('loadroom', function(data) {

				_.each(ChatroomListView.getWindows(), function(chat) {

					var roomName = chat.model.get("name");
					var dataName = data.room;
					if(roomName === dataName)
					{
						// We don't know what messages we have vs what we're receiving when we load
						// there could be many reasons for inconsistencies.
						// What we do is reset our list of messages, reset the view, and simply
						// re-render all the messages we're being given by the server
						chat.collection.reset();

						_.each(data.messages, function(message) {
							chat.addMessage(message);
						});

						//chat.updateUsers(data.users);
						//console.log("Room " + data.room + " has users " + data.users);
					}
				});
			});

			LocaleSocket.Handle('updateroomusers', function(rooms) {

				_.each(ChatroomListView.getRooms(), function(chat) {

					_.each(rooms, function(room) {
						var chatName = chat.model.get("name");
						var roomName = room.name;

						if(chatName === roomName)
						{
							chat.updateUsers(room.users);
						}

					});
				});
			});

			LocaleSocket.Handle('broadcastchat', function(data) {
				_.each(ChatroomListView.getWindows(), function(chat) {

					var roomName = chat.model.get("name");
					var dataName = data.room;
					if(roomName === dataName)
					{
						chat.addMessage(data, function(location, radius) {

							var pulse = new google.maps.Circle({
								center: new google.maps.LatLng(location.latitude, location.longitude),
								radius: 1,
								strokeColor: "#758ff9",
								strokeOpacity: 1,
								strokeWeight: 3,
								fillColor: "#758ff9",
								fillOpacity: 0
							});
							pulse.setMap(Map);

							var direction = 1;
							var rMin = 1, rMax = parseInt(radius);
							setInterval(function() {
								var radius = pulse.getRadius();
								if (radius > rMax) {
									pulse.setMap(null);
								}
								pulse.setRadius(radius + 5);
							}, 10);
						});
					}
				});
			});
		},

		rendered: function() {

			ProfileView = new LocaleProfileView();
			ChatroomListView = new LocaleChatroomListView({parent: this});

			Map = new google.maps.Map(this.$el.find("#map-wrapper")[0], mapOptions);

			Clusterer = new MarkerClusterer(Map, [], {gridSize: 50, maxZoom: 15});

			ProfileView.render();
			ChatroomListView.render();

			LocaleAuth.GetProfilePicture(function(model) {

				ProfileView.setProfilePic(model.get("profilePicture"));
				LocaleSocket.Emit('updateuser', { profilePicture: model.get("profilePicture") });
			});

			// Failed to get position, do nothing
			LocaleUtilities.GetCurrentLocation(function(position) {
				CurrentPosition = position;

			      var pos = new google.maps.LatLng(position.coords.latitude,
			                                       position.coords.longitude);
			     var marker = new google.maps.Marker({
				      position: pos,
				      map: Map,
				      icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
				  });

	      		Map.setCenter(pos);

				GeoDecoder.geocode({'latLng': pos}, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						if (results[0]) {
							ProfileView.setLocationText(results[0].formatted_address);
						} else {
							ProfileView.setLocationText('Unknown Location');
						}
					} else {
						console.log('Error decoding location. Code: ' + status);
					}
				});
			});
		},

		renderRooms: function(rooms, current) {

			var self = this;

			_.each(rooms, function(value) {
				
				// If this is set, it means the backend is telling us to update an existing room.
				// What we do here is remove the room to force it to un-render, update the model,
				// and the rest of the code after this block will make a new waypoint, add the updated model,
				// and re-render it
				if(value.updateRoom !== undefined)
				{
					var updatingLocale = ChatroomListView.collection.findWhere( { name: value.updateRoom} );

					if(updatingLocale !== undefined)
					{
						ChatroomListView.collection.remove(updatingLocale);
						//ChatroomListView.remove()
						this.removeMarker(value.updateRoom);

						updatingLocale.set("name", value.name);
						updatingLocale.set("description", value.description);
						updatingLocale.set("tags", value.tags);
						updatingLocale.set("privacy", value.privacy);

						value = _.clone(updatingLocale.attributes);
					}
				}

				// Disallow duplicates
				var exists = ChatroomListView.collection.where( { name: value.name} );
		
				if(exists.length === 0)
				{
					var pos = new google.maps.LatLng(value.location.latitude, value.location.longitude);

				    var marker = new google.maps.Marker({
					      position: pos,
					  });

					google.maps.event.addListener(marker, 'click', function() {
					   	//Pan to and do hovered

					    Map.panTo(marker.getPosition());

					    self.searchView.updateMarkerInfo(ChatroomListView.collection.findWhere( { name: value.name} ));
					});

					var circle = new google.maps.Circle({
						center: pos,
						radius: parseInt(value.radius), //Measured in meters
						fillColor: "#AEBDF9",
						fillOpacity: 0.3,
						strokeOpacity: 0.0,
						strokeWidth: 0,
						map: Map
					});

					this.removeMarker(value.name);
					Clusterer.addMarker(marker);

					mapMarkers.push( { name: value.name, map : { circle: circle, marker: marker} });

					ChatroomListView.add( new LocaleChatModel( { location: value.location, name: value.name, radius: value.radius, 
						canJoin: value.canJoin, userCount: value.userCount, tags: value.tags, description: value.description,
						privacy: value.privacy }));
				}

			}, this);
		},

		removeMarker: function(localeName) {
			var mapIndex = -1;

			// Find the marker
			for(var i = 0; i < mapMarkers.length; i++) {
				if(mapMarkers[i].name === localeName) {
					mapIndex = i;
					break;
				}
			}

			// Reset the markers by deleting their reference
			if( mapIndex !== -1)
			{

				var localeMarker = mapMarkers[mapIndex];
				mapMarkers.splice(mapIndex, 1);

				Clusterer.removeMarker(localeMarker.map.marker);

				localeMarker.map.circle.setMap(null);
				localeMarker.map.marker.setMap(null);

				delete localeMarker.map.circle;
				delete localeMarker.map.marker;
			}
		},

		getLocation: function() {
			return CurrentPosition;
		},
		
		getProfileView: function() {
			return ProfileView;
		},

		getListView: function() {
			return ChatroomListView;
		}
	});

	return LocaleMapView;
});
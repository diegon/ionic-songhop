angular.module('songhop.services', ['ionic.utils'])
.factory('User', function($http, $q, $localstorage, SERVER){

	var o = {
		username: false,
		session_id: false,
		favorites: [],
		newFavorites: 0
	}

	o.addSongToFavorites = function(song) {
		if(!song) return false;
		o.favorites.unshift(song);
		o.newFavorites++;

		return $http.post(SERVER.url + '/favorites', {session_id: o.session_id, song_id: song.song_id})
	};

	o.removeSongFromFavorites = function(song, index) {
		if(!song) return false;
		o.favorites.splice(index, 1);

		return $http.delete(SERVER.url + '/favorites', {session_id: o.session_id, song_id: song.song_id});
	};

	o.favoriteCount = function() {
		return o.newFavorites;
	}

	o.auth = function(username, signingUp) {
		var authRoute;

		if(signingUp) {
			authRoute = 'signup';
		} else {
			authRoute = 'login';
		}

		return $http.post(SERVER.url + '/' + authRoute, {username: username})
				.success(function(data) {
					o.setSession(data.username, data.session_id, data.favorites)
				});
	}

	o.populateFavorites = function() {
		return $http.get(SERVER.url + '/favorites', {session_id: o.session_id})
				.success(function(data) {
					o.favorites = data;
				})
	}

	o.setSession = function(username, session_id, favorites) {
		if (username) o.username = username;
		if (session_id) o.session_id = session_id;
		if(favorites) o.favorites = favorites;

		$localstorage.setObject('user', {username: username, session_id: session_id});
	}

	o.checkSession = function() {
		var defer = $q.defer();

		if (o.session_id) {
			defer.resolve(true);
		} else {
			var user = $localstorage.getObject('user');

			if (user.username) {
				o.setSession(user.username, user.session_id);
				o.populateFavorites().then(function() {
					defer.resolve(true);
				});
			} else {
				defer.resolve(false);
			}
		}

		return defer.promise;
	}

	o.destroySession = function() {
		$localstorage.setObject('user', {});
		o.username = false;
		o.session_id = false;
		o.favorites = [];
		o.newFavorites = 0;
	}

	return o;

})
.factory('Recommendations', function($http, $q, SERVER) {

	var o = {
		queue: []
	};
	var media;

	o.init = function() {
		if(o.queue.length === 0) {
			return o.getNextSongs();
		} else {
			return o.playCurrentSong();
		}
	};

	o.getNextSongs = function() {
		return $http({
			method: 'GET',
			url: SERVER.url + '/recommendations'
		}).success(function(data) {
			o.queue = o.queue.concat(data);
		});
	};

	o.nextSong = function() {
		o.queue.shift();
		o.haltAudio();
		if(o.queue.length < 3) {
			o.getNextSongs();
		}
	};

	o.playCurrentSong = function() {
		var defer = $q.defer();

		media = new Audio(o.queue[0].preview_url);

		media.addEventListener("loadeddata", function() {
			defer.resolve();
		});

		media.play();

		return defer.promise;
	};

	o.haltAudio = function() {
		if (media) media.pause();
	}

	return o;

})
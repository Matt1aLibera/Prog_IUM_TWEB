package com.example.springbootserver.services;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.models.Country;
import com.example.springbootserver.models.Movie;
import com.example.springbootserver.models.Poster;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
import com.example.springbootserver.repositories.CountryRepo;
import com.example.springbootserver.repositories.MovieRepo;
import com.example.springbootserver.repositories.PosterRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FilmAggregationService {
    private final MovieRepo movieRepo;
    private final ActorAppearanceRepo actorAppearanceRepo;
    private final CountryRepo countryRepo;
    private final PosterRepo posterRepo;

    @Autowired
    public FilmAggregationService(
            MovieRepo movieRepo,
            ActorAppearanceRepo actorAppearanceRepo,
            CountryRepo countryRepo,
            PosterRepo posterRepo) {
        this.movieRepo = movieRepo;
        this.actorAppearanceRepo = actorAppearanceRepo;
        this.countryRepo = countryRepo;
        this.posterRepo = posterRepo;
    }

    public List<FilmDetailsResponse> getFilmsDetails(List<Long> movieIds) {
        List<FilmDetailsResponse> responses = new ArrayList<>();

        // Recupera i film base
        List<Movie> movies = movieRepo.findByIdIn(movieIds);

        for (Movie movie : movies) {
            FilmDetailsResponse response = new FilmDetailsResponse();
            response.setId(movie.getId());
            response.setName(movie.getName());
            response.setDate(movie.getDate());
            response.setTagline(movie.getTagline());
            response.setDescription(movie.getDescription());
            response.setMinute(movie.getMinute());

            // Recupera attori
            List<ActorAppearance> actors = actorAppearanceRepo.findByMovieId(movie.getId());
            response.setActors(actors.stream()
                    .map(a -> a.getActorName() + " as " + a.getCharacterName())
                    .collect(Collectors.toList()));

            // Recupera paesi
            List<Country> countries = countryRepo.findByMovieId(movie.getId());
            response.setCountries(countries.stream()
                    .map(Country::getCountryName)
                    .collect(Collectors.toList()));

            // Recupera poster
            Optional<Poster> poster = posterRepo.findFirstByMovieId(movie.getId());
            response.setPosterLink(poster.map(Poster::getLink).orElse(""));

            responses.add(response);
        }

        return responses;
    }
}
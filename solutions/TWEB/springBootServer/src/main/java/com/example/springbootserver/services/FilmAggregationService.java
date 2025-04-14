package com.example.springbootserver.services;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.dtos.FilmPosterResponse;
import com.example.springbootserver.models.*;
import com.example.springbootserver.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FilmAggregationService {
    private final MovieRepo movieRepo;
    private final PosterRepo posterRepo;
    private final ActorAppearanceRepo actorAppearanceRepo;
    private final CountryRepo countryRepo;
    private final CrewRepo crewRepo;
    private final GenreRepo genreRepo;
    private final LanguageRepo languageRepo;
    private final ReleaseRepo releaseRepo;
    private final StudioRepo studioRepo;
    private final ThemeRepo themeRepo;

    @Autowired
    public FilmAggregationService(
            MovieRepo movieRepo,
            PosterRepo posterRepo,
            ActorAppearanceRepo actorAppearanceRepo,
            CountryRepo countryRepo,
            CrewRepo crewRepo,
            GenreRepo genreRepo,
            LanguageRepo languageRepo,
            ReleaseRepo releaseRepo,
            StudioRepo studioRepo,
            ThemeRepo themeRepo) {
        this.movieRepo = movieRepo;
        this.posterRepo = posterRepo;
        this.actorAppearanceRepo= actorAppearanceRepo;
        this.countryRepo = countryRepo;
        this.crewRepo = crewRepo;
        this.genreRepo = genreRepo;
        this.languageRepo = languageRepo;
        this.releaseRepo = releaseRepo;
        this.studioRepo = studioRepo;
        this.themeRepo = themeRepo;
    }

    public List<FilmPosterResponse> getFilmsPosters(List<Long> movieIds) {
        return movieRepo.findByIdIn(movieIds).stream()
                .map(movie -> {
                    FilmPosterResponse response = new FilmPosterResponse();
                    response.setId(movie.getId());
                    response.setName(movie.getName());

                    posterRepo.findFirstByMovieId(movie.getId())
                            .ifPresent(poster -> response.setPosterLink(poster.getLink()));

                    return response;
                })
                .collect(Collectors.toList());
    }

    public FilmDetailsResponse getFilmDetails(Long movieId) {
        // Recupera il film principale
        Movie movie = movieRepo.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Film non trovato"));

        // Recupera il poster
        Poster poster = posterRepo.findFirstByMovieId(movieId).orElse(null);

        // Recupera tutte le entità correlate
        List<ActorAppearance> actors = actorAppearanceRepo.findByMovieId(movieId);
        List<Country> countries = countryRepo.findByMovieId(movieId);
        List<Genre> genres = genreRepo.findByMovieId(movieId);
        List<Language> languages = languageRepo.findByMovieId(movieId);
        List<Studio> studios = studioRepo.findByMovieId(movieId);
        List<Theme> themes = themeRepo.findByMovieId(movieId);
        List<Crew> crew = crewRepo.findByMovieId(movieId);
        List<Release> releases = releaseRepo.findByMovieId(movieId);

        // Costruisci e restituisci la risposta
        return new FilmDetailsResponse(
                movie,
                poster,
                actors,
                countries,
                genres,
                languages,
                studios,
                themes,
                crew,
                releases
        );
    }
}
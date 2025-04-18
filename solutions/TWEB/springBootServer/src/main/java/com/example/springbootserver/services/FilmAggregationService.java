package com.example.springbootserver.services;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.dtos.FilmPosterResponse;
import com.example.springbootserver.dtos.FilmSearchResponse;
import com.example.springbootserver.models.*;
import com.example.springbootserver.repositories.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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

    // Metodo unico per entrambe le ricerche
    private List<FilmSearchResponse> searchFilms(String query, int limit) {
        String searchTerm = query.toLowerCase().trim(); // Trim per rimuovere spazi extra
        List<Movie> results = new ArrayList<>();

        // 1. Cerca film che iniziano esattamente con la query
        Page<Movie> exactMatches = movieRepo.findByNameStartingWith(
                searchTerm,
                PageRequest.of(0, limit)
        );
        results.addAll(exactMatches.getContent());

        // 2. Se necessario, cerca film che contengono la query
        if (results.size() < limit) {
            int remaining = limit - results.size();
            Page<Movie> containingMatches = movieRepo.findByNameContaining(
                    searchTerm,
                    PageRequest.of(0, remaining)
            );
            results.addAll(containingMatches.getContent());
        }

        // 3. Mappa a DTO con poster
        return results.stream()
                .map(movie -> {
                    FilmSearchResponse response = new FilmSearchResponse();
                    response.setId(movie.getId());
                    response.setName(movie.getName());
                    response.setYear(movie.getDate());
                    posterRepo.findFirstByMovieId(movie.getId())
                            .ifPresent(poster -> response.setPosterLink(poster.getLink()));
                    return response;
                })
                .collect(Collectors.toList());
    }

    public List<FilmSearchResponse> searchFilmsAutocomplete(String query) {
        return searchFilms(query, 5);
    }

    public Page<FilmSearchResponse> searchFilmsFull(String query, Pageable pageable) {
        String searchTerm = query.toLowerCase().trim();
        int pageSize = pageable.getPageSize();
        int pageNumber = pageable.getPageNumber();

        // 1. Prima cerca i film che iniziano con la query
        Page<Movie> exactMatchesPage = movieRepo.findByNameStartingWith(
                searchTerm,
                PageRequest.of(pageNumber, pageSize)
        );

        List<Movie> combinedResults = new ArrayList<>(exactMatchesPage.getContent());

        // 2. Se non abbiamo abbastanza risultati, cerca quelli che contengono la query
        if (combinedResults.size() < pageSize) {
            int remaining = pageSize - combinedResults.size();
            int subPage = 0;

            // Calcola la pagina corretta per i risultati "contiene"
            if (exactMatchesPage.getTotalElements() > 0) {
                subPage = (int) (pageNumber - (exactMatchesPage.getTotalElements() / pageSize));
            }

            Page<Movie> containingMatchesPage = movieRepo.findByNameContainingButNotStartingWith(
                    searchTerm,
                    PageRequest.of(Math.max(subPage, 0), remaining)
            );

            combinedResults.addAll(containingMatchesPage.getContent());
        }

        // 3. Calcola il totale combinato
        long totalExact = exactMatchesPage.getTotalElements();
        Page<Movie> containingTotalPage = movieRepo.findByNameContainingButNotStartingWith(
                searchTerm,
                PageRequest.of(0, 1) // Solo per ottenere il count
        );
        long totalCombined = totalExact + containingTotalPage.getTotalElements();

        // 4. Mappa a DTO
        List<FilmSearchResponse> content = combinedResults.stream()
                .map(movie -> {
                    FilmSearchResponse response = new FilmSearchResponse();
                    response.setId(movie.getId());
                    response.setName(movie.getName());
                    response.setYear(movie.getDate());
                    posterRepo.findFirstByMovieId(movie.getId())
                            .ifPresent(poster -> response.setPosterLink(poster.getLink()));
                    return response;
                })
                .collect(Collectors.toList());

        return new PageImpl<>(
                content,
                pageable,
                totalCombined
        );
    }
}

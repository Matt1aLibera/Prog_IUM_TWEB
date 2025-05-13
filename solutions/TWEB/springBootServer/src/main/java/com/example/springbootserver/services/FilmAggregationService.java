package com.example.springbootserver.services;

import com.example.springbootserver.dtos.FilmDetailsResponse;
import com.example.springbootserver.dtos.FilmPosterResponse;
import com.example.springbootserver.dtos.FilmSearchResponse;
import com.example.springbootserver.models.*;
import com.example.springbootserver.repositories.*;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FilmAggregationService {
    private final OscarAwardRepo oscarAwardRepo;
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
            OscarAwardRepo oscarAwardRepo,
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
        this.oscarAwardRepo = oscarAwardRepo;
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
    public Page<FilmSearchResponse> advancedSearchFilms(
            String title,
            String actor, String character, String crew, String studio,
            List<String> genres,
            Integer yearFrom, Integer yearTo,
            String oscarStatus,
            Pageable pageable) {

        // 1. Crea la specification di base (titolo + anno)
        Specification<Movie> spec = Specification.where(createBaseSpec(title, yearFrom, yearTo));

        // 2. Aggiungi filtro relazionale (solo uno sarà attivo)
        spec = spec.and(createRelationSpec(actor, character, crew, studio, genres));

        // 3. Esegui query paginata
        Page<Movie> moviePage = movieRepo.findAll(spec, pageable);

        // 4. Filtra per Oscar se necessario
        if (oscarStatus != null && !oscarStatus.equals("any")) {
            List<Movie> filtered = moviePage.getContent().stream()
                    .filter(movie -> hasOscarMatch(movie, oscarStatus))
                    .collect(Collectors.toList());

            return new PageImpl<>(
                    filtered.stream().map(this::mapToFilmSearchResponse).collect(Collectors.toList()),
                    pageable,
                    filtered.size()
            );
        }

        return moviePage.map(this::mapToFilmSearchResponse);
    }

    private boolean hasOscarMatch(Movie movie, String oscarStatus) {
        List<OscarAward> awards = oscarAwardRepo.findByFilmContainingIgnoreCaseAndYearFilmBetween(
                movie.getName(),
                movie.getDate() - 1,
                movie.getDate() + 1
        );

        return oscarStatus.equals("winner")
                ? awards.stream().anyMatch(OscarAward::getWinner)
                : !awards.isEmpty();
    }

// Metodi di supporto:

    private Page<Movie> findExactMatches(String title, String actor, String character, String crew, String studio,
                                         List<String> genres, Integer yearFrom, Integer yearTo, Pageable pageable) {
        Specification<Movie> spec = Specification.where(createBaseSpec(title, yearFrom, yearTo))
                .and(createRelationSpec(actor, character, crew, studio, genres));

        return movieRepo.findAll(spec, pageable);
    }

    private Page<Movie> findAdditionalMatches(String title, String actor, String character, String crew, String studio,
                                              List<String> genres, Integer yearFrom, Integer yearTo, int pageNumber,
                                              int remaining, long totalExact) {
        int subPage = calculateSubPage(pageNumber, totalExact, remaining);

        Specification<Movie> spec = Specification.where(createBaseSpec(title, yearFrom, yearTo))
                .and(createRelationSpec(actor, character, crew, studio, genres));

        return movieRepo.findAll(spec, PageRequest.of(subPage, remaining));
    }

    private long calculateTotalMatches(String title, String actor, String character, String crew, String studio,
                                       List<String> genres, Integer yearFrom, Integer yearTo) {
        Specification<Movie> spec = Specification.where(createBaseSpec(title, yearFrom, yearTo))
                .and(createRelationSpec(actor, character, crew, studio, genres));

        return movieRepo.count(spec);
    }

    private Specification<Movie> createBaseSpec(String title, Integer yearFrom, Integer yearTo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (title != null && !title.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + title.toLowerCase() + "%"));
            }
            if (yearFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), yearFrom));
            }
            if (yearTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), yearTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<Movie> createRelationSpec(String actor, String character, String crew,
                                                    String studio, List<String> genres) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Verifica che sia specificato solo un tipo di ricerca relazionale
            int relationFilters = 0;
            if (actor != null) relationFilters++;
            if (character != null) relationFilters++;
            if (crew != null) relationFilters++;
            if (studio != null) relationFilters++;

            if (relationFilters > 1) {
                throw new IllegalArgumentException("Puoi specificare solo un filtro tra attore, personaggio, crew e studio");
            }

            // Aggiungi il filtro specificato (solo uno sarà presente)
            if (actor != null) {
                predicates.add(createRelationPredicate(root, query, cb, ActorAppearance.class, "actorName", actor));
            }
            if (character != null) {
                predicates.add(createRelationPredicate(root, query, cb, ActorAppearance.class, "characterName", character));
            }
            if (crew != null) {
                predicates.add(createRelationPredicate(root, query, cb, Crew.class, "name", crew));
            }
            if (studio != null) {
                predicates.add(createRelationPredicate(root, query, cb, Studio.class, "studio", studio));
            }

            // I generi possono sempre essere aggiunti in AND con gli altri filtri
            if (genres != null && !genres.isEmpty()) {
                predicates.add(createGenrePredicate(root, query, cb, genres));
            }

            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate createRelationPredicate(Root<Movie> root, CriteriaQuery<?> query, CriteriaBuilder cb,
                                              Class<?> entityClass, String fieldName, String searchTerm) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<?> entityRoot = subquery.from(entityClass);

        return cb.in(root.get("id")).value(
                subquery.select(entityRoot.get("movieId"))
                        .where(cb.like(cb.lower(entityRoot.get(fieldName)), "%" + searchTerm.toLowerCase() + "%"))
        );
    }

    private Predicate createGenrePredicate(Root<Movie> root, CriteriaQuery<?> query, CriteriaBuilder cb, List<String> genres) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<Genre> genreRoot = subquery.from(Genre.class);

        return cb.in(root.get("id")).value(
                subquery.select(genreRoot.get("movieId"))
                        .where(genreRoot.get("genre").in(genres))
        );
    }

    private FilmSearchResponse mapToFilmSearchResponse(Movie movie) {
        FilmSearchResponse response = new FilmSearchResponse();
        response.setId(movie.getId());
        response.setName(movie.getName());
        response.setYear(movie.getDate());
        posterRepo.findFirstByMovieId(movie.getId())
                .ifPresent(poster -> response.setPosterLink(poster.getLink()));
        return response;
    }

    private int calculateSubPage(int pageNumber, long totalExact, int remaining) {
        if (totalExact > 0) {
            return (int) (pageNumber - (totalExact / remaining));
        }
        return 0;
    }
}
